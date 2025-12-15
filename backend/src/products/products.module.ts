import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { PrismaService } from '../prisma/prisma.service'; // 1. Trazendo o Prisma pra cá

@Module({
  controllers: [ProductsController],
  providers: [
    ProductsService, 
    PrismaService // 2. Avisando o módulo que ele pode usar o Prisma
  ],
})
export class ProductsModule {}