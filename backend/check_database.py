from app.core.config import settings

url = settings.DATABASE_URL

# Hide password if the URL contains credentials
if "@" in url and "://" in url:
    prefix, rest = url.split("://", 1)

    if "@" in rest:
        credentials, host = rest.split("@", 1)

        if ":" in credentials:
            username = credentials.split(":", 1)[0]
            safe_url = f"{prefix}://{username}:****@{host}"
        else:
            safe_url = f"{prefix}://****@{host}"
    else:
        safe_url = url
else:
    safe_url = url

print("DATABASE USED BY HERDSENSE AI:")
print(safe_url)