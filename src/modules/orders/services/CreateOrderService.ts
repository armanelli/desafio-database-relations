import { inject, injectable } from 'tsyringe';

import AppError from '@shared/errors/AppError';

import IProductsRepository from '@modules/products/repositories/IProductsRepository';
import ICustomersRepository from '@modules/customers/repositories/ICustomersRepository';
import Order from '../infra/typeorm/entities/Order';
import IOrdersRepository from '../repositories/IOrdersRepository';

interface IProduct {
  id: string;
  quantity: number;
}

interface IRequest {
  customer_id: string;
  products: IProduct[];
}

@injectable()
class CreateOrderService {
  constructor(
    @inject('OrdersRepository')
    private ordersRepository: IOrdersRepository,

    @inject('ProductsRepository')
    private productsRepository: IProductsRepository,

    @inject('CustomersRepository')
    private customersRepository: ICustomersRepository,
  ) {}

  public async execute({ customer_id, products }: IRequest): Promise<Order> {
    const customer = await this.customersRepository.findById(customer_id);

    if (!customer) {
      throw new AppError('Cliente não encontrato.', 400);
    }

    const productIds = products.map(product => ({
      id: product.id,
    }));

    const existingProducts = await this.productsRepository.findAllById(
      productIds,
    );

    products.forEach((value, index) => {
      if (!existingProducts[index]) {
        throw new AppError('Produto não encontrado.', 400);
      }
    });

    await this.productsRepository.updateQuantity(products);

    const productsInOrder = existingProducts.map(product => ({
      product_id: product.id,
      price: product.price,
      quantity: product.quantity,
    }));

    products.forEach((el, index) => {
      productsInOrder[index].quantity = el.quantity;
    });

    const order = await this.ordersRepository.create({
      customer,
      products: productsInOrder,
    });

    return order;
  }
}

export default CreateOrderService;
