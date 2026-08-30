from sqlalchemy import inspect, text

from app.db.database import engine


def main():
    inspector = inspect(engine)

    columns = {
        column["name"]
        for column in inspector.get_columns("users")
    }

    statements = []

    if "wallet_address" not in columns:
        statements.append(
            """
            ALTER TABLE users
            ADD COLUMN wallet_address VARCHAR(255)
            """
        )

    if "wallet_chain" not in columns:
        statements.append(
            """
            ALTER TABLE users
            ADD COLUMN wallet_chain VARCHAR(100)
            """
        )

    if "wallet_connected_at" not in columns:
        statements.append(
            """
            ALTER TABLE users
            ADD COLUMN wallet_connected_at TIMESTAMP
            """
        )

    if not statements:
        print("Wallet columns already exist. No database changes required.")
        return

    with engine.begin() as connection:
        for statement in statements:
            print("Executing:")
            print(statement.strip())
            connection.execute(text(statement))

    print()
    print("Wallet database columns added successfully.")


if __name__ == "__main__":
    main()