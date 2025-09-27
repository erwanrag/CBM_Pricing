class NotFoundError(Exception):
    def __init__(self, message: str = "Ressource non trouvée"):
        self.message = message
        super().__init__(self.message)

class UnauthorizedError(Exception):
    def __init__(self, message: str = "Non autorisé"):
        self.message = message
        super().__init__(self.message)
