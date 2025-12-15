import { Controller, Get, Post, Body, Param, Delete, Query, Patch } from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  create(@Body() createProductDto: any) {
    return this.productsService.create(createProductDto);
  }

  @Post('sell')
  sell(@Body() body: { code: string; quantity: number; batchId?: number; batchCodeString?: string }) {
    return this.productsService.sellProduct(body.code, body.quantity, body.batchId, body.batchCodeString);
  }

  // 👇 ESSA É A ROTA QUE ESTAVA FALTANDO OU COM PROBLEMA
  @Get('external-search')
  searchExternal(@Query('q') query: string) {
    return this.productsService.searchExternal(query);
  }

  @Get('code/:ean')
  findByCode(@Param('ean') ean: string) {
    return this.productsService.findByCode(ean);
  }

  @Get('lookup/:code')
  lookup(@Param('code') code: string) {
    return this.productsService.findExternalProduct(code);
  }

  @Get('alerts')
  findAlerts() {
    return this.productsService.findAlerts();
  }

  @Get()
  findAll() {
    return this.productsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateProductDto: UpdateProductDto) {
    return this.productsService.update(+id, updateProductDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.productsService.remove(+id);
  }
}