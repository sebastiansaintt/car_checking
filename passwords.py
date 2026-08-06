import secrets

def generate_password(length: int = 12) -> str:
    chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$*?"
    return "".join(secrets.choice(chars) for _ in range(length))


for i in range(4):
    print(f"Password {i + 1}: {generate_password()}")