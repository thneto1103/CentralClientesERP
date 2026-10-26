import json
import pathlib

files = {
    "mix-parfum": pathlib.Path(r"C:\Users\Thnet\Desktop\SaaSProjects\ERPOnlyPy-Demo\erp-desktop\.env"),
    "hara-perfumes": pathlib.Path(r"C:\Users\Thnet\Desktop\SaaSProjects\ERPOnlyPy\erp-desktop\.env"),
    "tabacaju": pathlib.Path(r"C:\Users\Thnet\Desktop\SaaSProjects\ERPOnlyPy-ylcfqm\erp-desktop\.env"),
    "elo": pathlib.Path(r"C:\Users\Thnet\Desktop\SaaSProjects\ERPOnlyPy-Elo\erp-desktop\.env"),
}
keys = [
    "ERP_DB_USER",
    "ERP_DB_HOST",
    "ERP_DB_PORT",
    "ERP_DB_NAME",
    "ERP_DB_PASSWORD",
    "ERP_DATABASE_URL",
    "FOCUS_NFE_CNPJ",
    "FOCUS_NFE_ENV",
    "FOCUS_NFE_TOKEN",
    "FOCUS_NFE_TOKEN_HOMOLOG",
    "FOCUS_NFE_TOKEN_PRODUCTION",
    "ERP_SMTP_HOST",
    "ERP_SMTP_PORT",
    "ERP_SMTP_USER",
    "ERP_SMTP_PASSWORD",
    "ERP_SMTP_FROM",
    "ERP_SMTP_TLS",
    "ERP_SMTP_SSL",
    "ERP_PRINTER_NAME",
]


def parse(path: pathlib.Path) -> dict[str, str]:
    data: dict[str, str] = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#") or "=" not in stripped:
            continue
        key, value = stripped.split("=", 1)
        data[key.strip()] = value.strip().strip('"').strip("'")
    return data


out: dict[str, dict[str, str]] = {}
for slug, path in files.items():
    env = parse(path)
    print(slug, " ".join(f"{key}:{'set' if env.get(key) else 'empty'}" for key in keys))
    out[slug] = {
        "dbUser": env.get("ERP_DB_USER", ""),
        "dbHost": env.get("ERP_DB_HOST", ""),
        "dbPort": env.get("ERP_DB_PORT", "") or "5432",
        "dbName": env.get("ERP_DB_NAME", "") or "postgres",
        "dbPassword": env.get("ERP_DB_PASSWORD", ""),
        "databaseUrl": env.get("ERP_DATABASE_URL", ""),
        "focusCnpj": env.get("FOCUS_NFE_CNPJ", ""),
        "focusEnv": env.get("FOCUS_NFE_ENV", ""),
        "focusToken": env.get("FOCUS_NFE_TOKEN", ""),
        "focusHomolog": env.get("FOCUS_NFE_TOKEN_HOMOLOG", ""),
        "focusProduction": env.get("FOCUS_NFE_TOKEN_PRODUCTION", ""),
        "smtpHost": env.get("ERP_SMTP_HOST", ""),
        "smtpPort": env.get("ERP_SMTP_PORT", ""),
        "smtpUser": env.get("ERP_SMTP_USER", ""),
        "smtpPassword": env.get("ERP_SMTP_PASSWORD", ""),
        "smtpFrom": env.get("ERP_SMTP_FROM", ""),
        "smtpTls": env.get("ERP_SMTP_TLS", ""),
        "smtpSsl": env.get("ERP_SMTP_SSL", ""),
        "printerName": env.get("ERP_PRINTER_NAME", ""),
    }

target = pathlib.Path(r"C:\Users\Thnet\Desktop\SaaSProjects\central-clientes\src\private-env.ts")
body = json.dumps(out, ensure_ascii=False, indent=2)
target.write_text(
    'import type { EnvSnapshot } from "./types";\n\n'
    "export const PRIVATE_ENV: Record<string, EnvSnapshot> = "
    + body
    + "\n",
    encoding="utf-8",
)
print("wrote", target.name, "bytes", target.stat().st_size)
