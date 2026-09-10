from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://transconnect:transconnect@localhost:5432/transconnect_semarang"
    cors_origins: str = "http://localhost:3000"
    geomapid_api_key: str = ""
    deepseek_api_key: str = ""
    # Infrastructure detector used to read citizen-report photos. In the
    # deployed stack this resolves container-to-container on proxy-net; when
    # running the backend on the host, point it at localhost:8000.
    yolo_api_url: str = "http://transconnect-api:8000"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


settings = Settings()
