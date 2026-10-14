class AppError(Exception):
    code = "application_error"
    status_code = 400

    def __init__(self, message: str = "The request could not be completed") -> None:
        super().__init__(message)
        self.message = message


class AuthenticationError(AppError):
    code = "authentication_failed"
    status_code = 401


class AuthorizationError(AppError):
    code = "not_authorized"
    status_code = 403


class NotFoundError(AppError):
    code = "not_found"
    status_code = 404


class ConflictError(AppError):
    code = "conflict"
    status_code = 409


class RateLimitError(AppError):
    code = "rate_limited"
    status_code = 429
