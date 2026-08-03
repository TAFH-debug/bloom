from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8-sig",
        extra="ignore",
    )

    database_url: str
    secret_key: str = "change-me"
    cors_origins: str = (
        "http://localhost:3000,http://localhost:1420,tauri://localhost,http://tauri.localhost"
    )
    google_client_id: str = ""
    google_client_secret: str = ""
    google_redirect_uri: str = "http://127.0.0.1:8000/auth/google/callback"
    session_max_age_days: int = 30

    @property
    def origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()  # type: ignore[call-arg]
