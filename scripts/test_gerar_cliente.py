"""O gerador recusa banco incompleto e não migra loja que já existe."""

import unittest
from pathlib import Path
from tempfile import TemporaryDirectory
from types import SimpleNamespace
from unittest.mock import patch

import gerar_cliente


def _payload(**overrides):
    data = {
        "slug": "loja-nova",
        "tradeName": "Loja Nova",
        "dbUser": "postgres.novaloja",
        "dbHost": "aws-1-us-east-1.pooler.supabase.com",
        "dbPassword": "senha-teste",
        "dbPort": "5432",
        "dbName": "postgres",
        "cnpj": "12345678000199",
    }
    data.update(overrides)
    return data


class GerarClienteTests(unittest.TestCase):
    def test_render_requires_every_database_field(self):
        with self.assertRaises(ValueError):
            gerar_cliente.render_env(_payload(dbHost=""))

    def test_quotes_password_with_hash(self):
        text = gerar_cliente.render_env(_payload(dbPassword="a#b"))
        self.assertIn('ERP_DB_PASSWORD="a#b"\n', text)
        self.assertIn("ERP_DB_USER=postgres.novaloja\n", text)

    def test_gerar_refuses_known_store_before_copy(self):
        calls = []

        def run(*_args, **_kwargs):
            calls.append(True)
            return SimpleNamespace(returncode=0, stdout="", stderr="")

        with TemporaryDirectory() as tmp:
            result = gerar_cliente.package_client(
                _payload(dbUser="postgres.aepwxmawlifqkfczoicc"),
                output_root=Path(tmp),
                dist_dir=Path(tmp) / "missing-dist",
                installer=Path(tmp) / "missing.bat",
                migrate=True,
                run=run,
            )
        self.assertFalse(result.ok)
        self.assertIn("já é de uma loja", result.message)
        self.assertEqual(calls, [])

    def test_package_writes_zip_and_leaves_source_env_alone(self):
        with TemporaryDirectory() as tmp:
            root = Path(tmp)
            source_env = root / "source.env"
            source_env.write_text("ERP_DB_PASSWORD=nao-mexer\n", encoding="utf-8")
            dist = root / "dist"
            dist.mkdir()
            (dist / "ERPVarejo.exe").write_bytes(b"exe")
            (dist / "lib.dll").write_bytes(b"dll")
            installer = root / "Instalar ERP Varejo.bat"
            installer.write_text("@echo off\n", encoding="utf-8")
            result = gerar_cliente.package_client(
                _payload(),
                output_root=root / "out",
                dist_dir=dist,
                installer=installer,
                migrate=False,
            )
            self.assertTrue(result.ok, result.message)
            app_env = (root / "out" / "loja-nova" / "ERPVarejo" / ".env").read_text(encoding="utf-8")
            self.assertIn("ERP_DB_USER=postgres.novaloja", app_env)
            self.assertNotIn("nao-mexer", app_env)
            self.assertEqual(source_env.read_text(encoding="utf-8"), "ERP_DB_PASSWORD=nao-mexer\n")
            with __import__("zipfile").ZipFile(root / "out" / "loja-nova" / "ERPVarejo-Instalador.zip") as archive:
                names = set(archive.namelist())
            self.assertIn("ERPVarejo/ERPVarejo.exe", names)
            self.assertIn("ERPVarejo/.env", names)
            self.assertIn("Instalar ERP Varejo.bat", names)

    def test_migrate_points_at_the_client_env_only(self):
        seen = {}

        def run(cmd, cwd, env, check, capture_output, text):
            seen["cmd"] = cmd
            seen["env"] = env
            return SimpleNamespace(returncode=0, stdout="", stderr="")

        with TemporaryDirectory() as tmp:
            env_path = Path(tmp) / ".env"
            env_path.write_text("ERP_DB_PASSWORD=x\n", encoding="utf-8")
            python_exe = Path(tmp) / "python.exe"
            python_exe.write_bytes(b"")
            with patch.dict("os.environ", {"ERP_DB_PASSWORD": "herdada", "ERP_DATABASE_URL": "herdada"}, clear=False):
                result = gerar_cliente.migrate_database(
                    env_path,
                    erp_desktop=Path(tmp),
                    python_exe=python_exe,
                    run=run,
                )
        self.assertTrue(result.ok, result.message)
        self.assertEqual(seen["env"]["ERP_ENV_FILE"], str(env_path))
        self.assertNotIn("ERP_DB_PASSWORD", seen["env"])
        self.assertNotIn("ERP_DATABASE_URL", seen["env"])
        self.assertIn("alembic", seen["cmd"])

    def test_folder_rejects_path_escape(self):
        result = gerar_cliente.ensure_folder("..\\ERPOnlyPy", "Loja", output_root=Path("."))
        self.assertFalse(result.ok)


if __name__ == "__main__":
    unittest.main()
