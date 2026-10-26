"""Gera a pasta, o zip e o executável de uma loja a partir do ERP principal.

Não altera o .env do código-fonte e não instala em %LOCALAPPDATA%.
"""

from __future__ import annotations

import argparse
import os
import re
import shutil
import subprocess
import sys
import zipfile
from dataclasses import dataclass
from pathlib import Path

SOURCE = Path(r"C:\Users\Thnet\Desktop\SaaSProjects\ERPOnlyPy")
ERP_DESKTOP = SOURCE / "erp-desktop"
DIST = ERP_DESKTOP / "dist" / "ERPVarejo"
INSTALLER = ERP_DESKTOP / "installer" / "Instalar ERP Varejo.bat"
OUTPUT_ROOT = Path(r"C:\Users\Thnet\Desktop\SaaSProjects\clientes")
VENV_PYTHON = ERP_DESKTOP / ".venv" / "Scripts" / "python.exe"

KNOWN_REFS = (
    "gqrfzsgcfwpadyvfnbes",
    "aepwxmawlifqkfczoicc",
    "ylcfqmnowjewynsvtxqc",
    "zxfvaawfbrfjuxsjbvif",
)

KNOWN_ENV_FILES = {
    "mix-parfum": Path(r"C:\Users\Thnet\Desktop\SaaSProjects\ERPOnlyPy-Demo\erp-desktop\.env"),
    "hara-perfumes": Path(r"C:\Users\Thnet\Desktop\SaaSProjects\ERPOnlyPy\erp-desktop\.env"),
    "tabacaju": Path(r"C:\Users\Thnet\Desktop\SaaSProjects\ERPOnlyPy-ylcfqm\erp-desktop\.env"),
    "elo": Path(r"C:\Users\Thnet\Desktop\SaaSProjects\ERPOnlyPy-Elo\erp-desktop\.env"),
}

TRADE_NAMES = {
    "mix-parfum": "Mix Parfum",
    "hara-perfumes": "Hara Perfumes",
    "tabacaju": "Tabacaju",
    "elo": "ELO",
}

DB_KEYS = ("ERP_DB_PASSWORD", "ERP_DB_USER", "ERP_DB_HOST", "ERP_DB_PORT", "ERP_DB_NAME", "ERP_DATABASE_URL")
SLUG_RE = re.compile(r"[a-z0-9]+(?:-[a-z0-9]+)*")


@dataclass
class Result:
    ok: bool
    message: str


def safe_slug(slug: str) -> str:
    cleaned = (slug or "").strip().lower()
    if not SLUG_RE.fullmatch(cleaned):
        raise ValueError("Identificador inválido.")
    return cleaned


def references_known_store(user: str, host: str) -> bool:
    blob = f"{user} {host}".lower()
    return any(ref in blob for ref in KNOWN_REFS)


def client_root(slug: str, output_root: Path = OUTPUT_ROOT) -> Path:
    return output_root / safe_slug(slug)


def _env_line(key: str, value: str) -> str:
    if "\n" in value or "\r" in value:
        raise ValueError(f"{key} contém quebra de linha.")
    if value == "":
        return f"{key}="
    if re.fullmatch(r"[A-Za-z0-9@._:/-]+", value):
        return f"{key}={value}"
    escaped = value.replace("\\", "\\\\").replace('"', '\\"')
    return f'{key}="{escaped}"'


def render_env(payload: dict) -> str:
    user = str(payload.get("dbUser") or "").strip()
    host = str(payload.get("dbHost") or "").strip()
    password = str(payload.get("dbPassword") or "")
    port = str(payload.get("dbPort") or "").strip()
    name = str(payload.get("dbName") or "").strip()
    missing = [
        label
        for label, value in (
            ("usuário", user),
            ("host", host),
            ("senha", password),
            ("porta", port),
            ("nome do banco", name),
        )
        if not str(value).strip()
    ]
    if missing:
        raise ValueError("Preencha " + ", ".join(missing) + ".")
    if not port.isdigit():
        raise ValueError("A porta do banco precisa ser numérica.")
    cnpj = "".join(ch for ch in str(payload.get("cnpj") or "") if ch.isdigit())
    if len(cnpj) != 14:
        cnpj = "00000000000000"
    lines = [
        _env_line("ERP_DB_PASSWORD", password),
        _env_line("ERP_DB_USER", user),
        _env_line("ERP_DB_HOST", host),
        _env_line("ERP_DB_PORT", port),
        _env_line("ERP_DB_NAME", name),
        _env_line("FOCUS_NFE_TOKEN_HOMOLOG", str(payload.get("focusHomolog") or "")),
        _env_line("FOCUS_NFE_TOKEN_PRODUCTION", str(payload.get("focusProduction") or "")),
        _env_line("FOCUS_NFE_CNPJ", cnpj),
    ]
    token = str(payload.get("focusToken") or "")
    if token:
        lines.append(_env_line("FOCUS_NFE_TOKEN", token))
    smtp_host = str(payload.get("smtpHost") or "").strip()
    if smtp_host:
        lines.extend(
            [
                _env_line("ERP_SMTP_HOST", smtp_host),
                _env_line("ERP_SMTP_PORT", str(payload.get("smtpPort") or "").strip()),
                _env_line("ERP_SMTP_USER", str(payload.get("smtpUser") or "").strip()),
                _env_line("ERP_SMTP_PASSWORD", str(payload.get("smtpPassword") or "")),
                _env_line("ERP_SMTP_FROM", str(payload.get("smtpFrom") or "").strip()),
                _env_line("ERP_SMTP_TLS", str(payload.get("smtpTls") or "").strip()),
                _env_line("ERP_SMTP_SSL", str(payload.get("smtpSsl") or "").strip()),
            ]
        )
    printer = str(payload.get("printerName") or "").strip()
    if printer:
        lines.append(_env_line("ERP_PRINTER_NAME", printer))
    return "\n".join(lines) + "\n"


def read_env_file(path: Path) -> dict[str, str]:
    values: dict[str, str] = {}
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        value = value.strip()
        if len(value) >= 2 and value[0] == value[-1] and value[0] in {'"', "'"}:
            value = value[1:-1]
        values[key.strip()] = value
    return values


def payload_from_env(slug: str, trade_name: str, values: dict[str, str]) -> dict:
    return {
        "slug": slug,
        "tradeName": trade_name,
        "dbUser": values.get("ERP_DB_USER", ""),
        "dbHost": values.get("ERP_DB_HOST", ""),
        "dbPassword": values.get("ERP_DB_PASSWORD", ""),
        "dbPort": values.get("ERP_DB_PORT", ""),
        "dbName": values.get("ERP_DB_NAME", ""),
        "cnpj": values.get("FOCUS_NFE_CNPJ", ""),
        "focusHomolog": values.get("FOCUS_NFE_TOKEN_HOMOLOG", ""),
        "focusProduction": values.get("FOCUS_NFE_TOKEN_PRODUCTION", ""),
        "focusToken": values.get("FOCUS_NFE_TOKEN", ""),
        "smtpHost": values.get("ERP_SMTP_HOST", ""),
        "smtpPort": values.get("ERP_SMTP_PORT", ""),
        "smtpUser": values.get("ERP_SMTP_USER", ""),
        "smtpPassword": values.get("ERP_SMTP_PASSWORD", ""),
        "smtpFrom": values.get("ERP_SMTP_FROM", ""),
        "smtpTls": values.get("ERP_SMTP_TLS", ""),
        "smtpSsl": values.get("ERP_SMTP_SSL", ""),
        "printerName": values.get("ERP_PRINTER_NAME", ""),
    }


def write_readme(root: Path, trade_name: str, slug: str) -> None:
    root.mkdir(parents=True, exist_ok=True)
    text = (
        f"Loja: {trade_name}\n"
        f"Identificador: {slug}\n\n"
        "O zip para a loja é ERPVarejo-Instalador.zip.\n"
        "Para conferir neste computador, abra ERPVarejo\\ERPVarejo.exe.\n"
        "Não rode o instalador aqui: ele grava em %LOCALAPPDATA%\\Programs\\ERPVarejo\n"
        "e substitui outra loja instalada neste PC.\n\n"
        "O zip só existe depois que o banco Supabase está preenchido na Central.\n"
    )
    (root / "LEIA-ME.txt").write_text(text, encoding="utf-8")


def ensure_folder(slug: str, trade_name: str, output_root: Path = OUTPUT_ROOT) -> Result:
    try:
        cleaned = safe_slug(slug)
    except ValueError as exc:
        return Result(False, str(exc))
    root = output_root / cleaned
    write_readme(root, trade_name.strip() or cleaned, cleaned)
    return Result(True, f"Pasta pronta: {root}")


def _copy_app(dist_dir: Path, app_dir: Path) -> Result | None:
    exe = dist_dir / "ERPVarejo.exe"
    if not exe.is_file():
        return Result(
            False,
            "O executável ainda não foi compilado. Na ficha, use Recompilar código e tente de novo.",
        )
    if app_dir.exists():
        try:
            shutil.rmtree(app_dir)
        except OSError:
            return Result(False, "Feche o ERPVarejo.exe dessa pasta e tente de novo.")
    shutil.copytree(dist_dir, app_dir)
    return None


def package_client(
    payload: dict,
    *,
    output_root: Path = OUTPUT_ROOT,
    dist_dir: Path = DIST,
    installer: Path = INSTALLER,
    migrate: bool = False,
    erp_desktop: Path = ERP_DESKTOP,
    python_exe: Path = VENV_PYTHON,
    run=subprocess.run,
) -> Result:
    try:
        slug = safe_slug(str(payload.get("slug") or ""))
        env_text = render_env(payload)
    except ValueError as exc:
        return Result(False, str(exc))
    user = str(payload.get("dbUser") or "")
    host = str(payload.get("dbHost") or "")
    if migrate and references_known_store(user, host):
        return Result(
            False,
            "Esse banco já é de uma loja existente. Use Empacotar, que não roda migração.",
        )
    if not installer.is_file():
        return Result(False, f"Instalador não encontrado: {installer}")
    root = output_root / slug
    write_readme(root, str(payload.get("tradeName") or slug), slug)
    app_dir = root / "ERPVarejo"
    copied = _copy_app(dist_dir, app_dir)
    if copied is not None:
        return copied
    env_path = app_dir / ".env"
    env_path.write_text(env_text, encoding="utf-8")
    zip_path = root / "ERPVarejo-Instalador.zip"
    partial = root / "ERPVarejo-Instalador.zip.part"
    if partial.exists():
        partial.unlink()
    with zipfile.ZipFile(partial, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        for path in app_dir.rglob("*"):
            if path.is_file():
                arcname = (Path("ERPVarejo") / path.relative_to(app_dir)).as_posix()
                archive.write(path, arcname)
        archive.write(installer, "Instalar ERP Varejo.bat")
    partial.replace(zip_path)
    if migrate:
        migrated = migrate_database(env_path, erp_desktop=erp_desktop, python_exe=python_exe, run=run)
        if not migrated.ok:
            return migrated
        return Result(True, f"Instalador gerado e banco migrado: {zip_path}")
    return Result(True, f"Instalador empacotado, sem migração: {zip_path}")


def migrate_database(env_path: Path, *, erp_desktop: Path, python_exe: Path, run=subprocess.run) -> Result:
    if not env_path.is_file():
        return Result(False, "O .env da loja não foi gravado.")
    if not python_exe.is_file():
        return Result(False, f"Python do ERP não encontrado: {python_exe}")
    child_env = os.environ.copy()
    for key in DB_KEYS:
        child_env.pop(key, None)
    child_env["ERP_ENV_FILE"] = str(env_path)
    completed = run(
        [str(python_exe), "-m", "alembic", "upgrade", "head"],
        cwd=str(erp_desktop),
        env=child_env,
        check=False,
        capture_output=True,
        text=True,
    )
    if completed.returncode != 0:
        detail = (completed.stderr or completed.stdout or "").strip().splitlines()
        tail = detail[-1] if detail else "erro desconhecido"
        return Result(False, f"A migração não concluiu: {tail}")
    return Result(True, "Migração concluída.")


def open_client(slug: str, output_root: Path = OUTPUT_ROOT) -> Result:
    try:
        root = client_root(slug, output_root)
    except ValueError as exc:
        return Result(False, str(exc))
    exe = root / "ERPVarejo" / "ERPVarejo.exe"
    if not exe.is_file():
        return Result(False, "Essa loja ainda não tem executável. Gere o instalador antes.")
    subprocess.Popen(
        [str(exe)],
        cwd=str(exe.parent),
        stdin=subprocess.DEVNULL,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        creationflags=subprocess.DETACHED_PROCESS | subprocess.CREATE_NEW_PROCESS_GROUP,
    )
    return Result(True, f"App aberto: {exe}")


def recompile(erp_desktop: Path = ERP_DESKTOP, run=subprocess.run) -> Result:
    bat = erp_desktop / "build.bat"
    if not bat.is_file():
        return Result(False, f"build.bat não encontrado em {erp_desktop}")
    completed = run(["cmd", "/c", str(bat)], cwd=str(erp_desktop), check=False)
    if completed.returncode != 0:
        return Result(False, "A compilação falhou. Feche o ERPVarejo.exe se ele estiver aberto e tente de novo.")
    return Result(True, "Executável recompilado. Gere de novo a loja para copiar essa versão.")


def status(slug: str, output_root: Path = OUTPUT_ROOT) -> dict:
    try:
        root = client_root(slug, output_root)
    except ValueError as exc:
        return {"ok": False, "message": str(exc)}
    return {
        "ok": True,
        "folder": str(root),
        "folderExists": root.is_dir(),
        "exeExists": (root / "ERPVarejo" / "ERPVarejo.exe").is_file(),
        "zipExists": (root / "ERPVarejo-Instalador.zip").is_file(),
    }


def materialize_known(
    *,
    output_root: Path = OUTPUT_ROOT,
    dist_dir: Path = DIST,
    installer: Path = INSTALLER,
    env_files: dict[str, Path] | None = None,
) -> list[str]:
    notes: list[str] = []
    files = env_files or KNOWN_ENV_FILES
    for slug, path in files.items():
        if not path.is_file():
            notes.append(f"{slug}: .env ausente, pasta não gerada")
            continue
        payload = payload_from_env(slug, TRADE_NAMES.get(slug, slug), read_env_file(path))
        result = package_client(
            payload,
            output_root=output_root,
            dist_dir=dist_dir,
            installer=installer,
            migrate=False,
        )
        notes.append(f"{slug}: {result.message}" if result.ok else f"{slug}: {result.message}")
    return notes


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Gerar a pasta de um cliente")
    sub = parser.add_subparsers(dest="cmd", required=True)
    sub.add_parser("materializar", help="Empacotar Mix, Hara, Tabacaju e ELO sem migrar")
    args = parser.parse_args(argv)
    if args.cmd == "materializar":
        for line in materialize_known():
            print(line)
        return 0
    return 1


if __name__ == "__main__":
    sys.exit(main())
