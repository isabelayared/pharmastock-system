import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  // BASE DE DADOS REALISTA (Top Medicamentos do Brasil)
  private medicineDatabase = {
    // Analgésicos e Relaxantes
    '7891058001421': { name: 'Neosaldina 30 Drágeas', category: 'Analgésico', description: 'Dipirona + Isometepteno + Cafeína' },
    '7896006200021': { name: 'Dorflex 36 Comprimidos', category: 'Relaxante Muscular', description: 'Dipirona + Citrato de Orfenadrina + Cafeína' },
    '7897595603706': { name: 'Torsilax 30 Comprimidos', category: 'Anti-inflamatório', description: 'Diclofenaco + Carisoprodol + Paracetamol + Cafeína' },
    '7891058022068': { name: 'Buscopan Composto', category: 'Antiespasmódico', description: 'Butilbrometo de escopolamina + Dipirona' },
    '7896094920217': { name: 'Advil 400mg', category: 'Analgésico', description: 'Ibuprofeno' },
    '7891142122116': { name: 'Tylenol 750mg', category: 'Analgésico', description: 'Paracetamol' },
    '7896006262510': { name: 'Brometo de Ipratrópio 0,25mg', category: 'Asma', description: 'Genérico' },

    // Uso Contínuo / Farmácia Popular
    '7896181901747': { name: 'Besilato de Anlodipino 5mg', category: 'Hipertensão', description: 'Genérico Medley' },
    '7896202520513': { name: 'Captopril 25mg', category: 'Hipertensão', description: 'Genérico' },
    '7899620911031': { name: 'Sinvastatina 20mg', category: 'Colesterol', description: 'Genérico' },
    '7896112137030': { name: 'Sulfato de Salbutamol 100mcg', category: 'Asma', description: 'Aerossol' },
    '7896672202872': { name: 'Dipropionato de Beclometasona 200mcg', category: 'Asma', description: 'Spray' },
    '7891045008433': { name: 'Ciclo 21', category: 'Anticoncepcional', description: 'Levonorgestrel + Etinilestradiol' },

    // Outros Comuns
    '7891010570026': { name: 'Rivotril 2mg', category: 'Controlado', description: 'Clonazepam (Tarja Preta)' },
    '7896094200630': { name: 'Allegra 120mg', category: 'Antialérgico', description: 'Cloridrato de Fexofenadina' },
    '7896658033469': { name: 'Omeprazol 20mg', category: 'Gástrico', description: 'Cápsulas' },
  };

  // --- BUSCA EXTERNA (Simulando API Real) ---
  searchExternal(query: string) {
    if (!query || query.length < 3) return [];
    
    const lowerQuery = query.toLowerCase();
    
    return Object.entries(this.medicineDatabase)
      .filter(([ean, prod]) => 
        prod.name.toLowerCase().includes(lowerQuery) || 
        ean.includes(query) || 
        prod.category.toLowerCase().includes(lowerQuery)
      )
      .map(([ean, prod]) => ({
        code: ean,
        name: prod.name,
        category: prod.category,
        description: prod.description
      }));
  }

  findExternalProduct(code: string) {
    return this.medicineDatabase[code] || null;
  }

  // --- MÉTODOS DE CADASTRO E VENDA ---
  async create(createProductDto: any) { 
    const { name, code, category, quantity, expirationDate, batchCode } = createProductDto;
    const finalBatchCode = batchCode || `${code}-${Date.now()}`;

    const existingProduct = await this.prisma.product.findUnique({ where: { code } });

    if (existingProduct) {
      return this.prisma.batch.create({
        data: {
          code: finalBatchCode,
          quantity: Number(quantity),
          expirationDate: new Date(expirationDate),
          productId: existingProduct.id,
        },
      });
    } else {
      return this.prisma.product.create({
        data: {
          name, code, category,
          batches: {
            create: [{
              code: finalBatchCode,
              quantity: Number(quantity),
              expirationDate: new Date(expirationDate),
            }],
          },
        },
        include: { batches: true },
      });
    }
  }

  async sellProduct(code: string, quantityToSell: number, batchId?: number, batchCodeString?: string) {
    const product = await this.prisma.product.findFirst({ where: { code }, include: { batches: true } });
    if (!product) throw new NotFoundException('Produto não encontrado no estoque!');

    let targetBatch: any = null;
    if (batchId) targetBatch = product.batches.find(b => b.id === batchId);
    else if (batchCodeString) targetBatch = product.batches.find(b => b.code === batchCodeString);

    if (targetBatch) {
      if (targetBatch.quantity < quantityToSell) return { status: 'ERROR', message: `Saldo insuficiente no lote ${targetBatch.code}!` };
      await this.prisma.batch.update({ where: { id: targetBatch.id }, data: { quantity: targetBatch.quantity - quantityToSell } });
      return { status: 'SUCCESS', message: `Venda do Lote ${targetBatch.code} OK!` };
    }

    // FEFO
    const batches = product.batches.sort((a, b) => a.expirationDate.getTime() - b.expirationDate.getTime());
    let remaining = quantityToSell;
    for (const batch of batches) {
      if (remaining <= 0) break;
      if (batch.quantity > 0) {
        const take = Math.min(remaining, batch.quantity);
        await this.prisma.batch.update({ where: { id: batch.id }, data: { quantity: batch.quantity - take } });
        remaining -= take;
      }
    }
    if (remaining > 0) return { status: 'PARTIAL', message: `Faltaram ${remaining} unidades.` };
    return { status: 'SUCCESS', message: 'Venda FEFO realizada!' };
  }

  // --- OUTROS MÉTODOS PADRÃO ---
  findAll() { return this.prisma.product.findMany({ include: { batches: true } }); }
  findOne(id: number) { return this.prisma.product.findUnique({ where: { id }, include: { batches: true } }); }
  async findByCode(code: string) { return this.prisma.product.findFirst({ where: { code }, include: { batches: true } }); }
  
  // 👇 AQUI ESTÁ A FUNÇÃO QUE FALTAVA
  update(id: number, updateProductDto: UpdateProductDto) {
    return `This action updates a #${id} product`;
  }

  async remove(id: number) {
    await this.prisma.batch.deleteMany({ where: { productId: id } });
    return this.prisma.product.delete({ where: { id } });
  }

  async findAlerts() {
    const products = await this.prisma.product.findMany({ include: { batches: true } });
    const alerts: any[] = [];
    const today = new Date();
    products.forEach((product) => {
      product.batches.forEach((batch) => {
        const diffTime = batch.expirationDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays <= 30 && diffDays >= 0) alerts.push({ product: product.name, batchId: batch.id, daysRemaining: diffDays });
      });
    });
    return alerts;
  }
}