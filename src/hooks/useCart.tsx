import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      console.log(productId);
      const productInCart = cart.find(product => product.id === productId);

      if (!productInCart) {
        const { data: product } = await api.get<Product>(`/products/${productId}`);
        const { data: stock } = await api.get<Stock>(`/stock/${productId}`);

        if (stock.amount > 0) {
          setCart([...cart, {...product, amount: 1 }]);
          localStorage.setItem('@RocketShoes:cart', JSON.stringify([...cart, {...product, amount: 1}]));
          return
        }
      } else {
        const { data: stock } = await api.get<Stock>(`/stock/${productId}`);

        if (stock.amount > productInCart.amount) {
            const newCart = cart.map(item => item.id === productId ? {
              ...item,
              amount: Number(item.amount) + 1
            } : item);
            setCart(newCart);
            localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
        } else {
          toast.error('Quantidade solicitada fora de estoque');
          console.log({stock: stock.amount, item: productInCart.amount})
          return;
        }
      }

    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const productExists = cart.some(cartProduct => cartProduct.id === productId);

      if (!productExists) {
        toast.error('Erro na remoção do produto');
        return;
      }

      const newCart = cart.filter(cartProduct => cartProduct.id !== productId);
      setCart(newCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
      
    } catch {
      toast.error('Erro na remoção do produto');
      return;
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      
      
      if (amount < 1) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }
      
      
      const response = await api.get(`/stock/${productId}`);
      const productAmount = response.data.amount;
      const stockAvailable = productAmount >= amount;

      if (!stockAvailable) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }
      const productExists = cart.some(cartProduct => cartProduct.id === productId);
      if (!productExists) {
        toast.error('Erro na alteração de quantidade do produto');
      }
      const newCart = cart.map(item => item.id === productId ? {
        ...item,
        amount: amount
      } : item);

      setCart(newCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
      return;
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
