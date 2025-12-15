export class CreateProductDto {
  name: string;
  code: string;
  category?: string;
  // Adicionamos estes dois:
  quantity: string; // Recebemos como texto do formulário
  expirationDate: string; // Data vem como texto "2025-12-31"
}