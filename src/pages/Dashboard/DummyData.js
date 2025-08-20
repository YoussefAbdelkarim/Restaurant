// DummyData.js

// --- Dummy Orders ---
export const dummyOrders = [
  {
    id: 1,
    customerName: 'John Doe',
    contact: '+1 234 567 890',
    items: [
      { name: 'Pizza', quantity: 2, price: 10 },
      { name: 'Coke', quantity: 2, price: 2 }
    ],
    totalPrice: 24,
    date: '2025-08-12 14:30',
    status: 'Pending'
  },
  {
    id: 2,
    customerName: 'Sarah Smith',
    contact: '+1 987 654 321',
    items: [
      { name: 'Burger', quantity: 1, price: 8 },
      { name: 'Fries', quantity: 2, price: 3 }
    ],
    totalPrice: 14,
    date: '2025-08-11 19:15',
    status: 'Completed'
  },
  {
    id: 3,
    customerName: 'Mike Johnson',
    contact: '+1 555 234 987',
    items: [
      { name: 'Salad', quantity: 1, price: 5 },
      { name: 'Water', quantity: 1, price: 1 }
    ],
    totalPrice: 6,
    date: '2025-08-13 12:45',
    status: 'Preparing'
  },
  {
    id: 4,
    customerName: 'Emma Wilson',
    contact: '+1 666 888 123',
    items: [
      { name: 'Pasta', quantity: 3, price: 7 },
      { name: 'Orange Juice', quantity: 2, price: 3 }
    ],
    totalPrice: 27,
    date: '2025-08-14 18:00',
    status: 'Completed'
  }
];

// --- Dummy Inventory ---
export const dummyInventory = [
  {
    id: 1,
    name: 'Pizza Dough',
    stock: 20,
    threshold: 5,
    supplier: 'ABC Foods'
  },
  {
    id: 2,
    name: 'Tomato Sauce',
    stock: 8,
    threshold: 10,
    supplier: 'Tomato Co.'
  },
  {
    id: 3,
    name: 'Cheese',
    stock: 3,
    threshold: 5,
    supplier: 'Dairy Best'
  },
  {
    id: 4,
    name: 'Burger Patties',
    stock: 15,
    threshold: 5,
    supplier: 'Meat Supplier Inc.'
  },
  {
    id: 5,
    name: 'Lettuce',
    stock: 2,
    threshold: 5,
    supplier: 'Fresh Greens'
  },
  {
    id: 6,
    name: 'Coke Bottles',
    stock: 25,
    threshold: 10,
    supplier: 'Beverage Corp.'
  },
  {
    id: 7,
    name: 'Fries',
    stock: 12,
    threshold: 5,
    supplier: 'Potato World'
  },
  {
    id: 8,
    name: 'Pasta',
    stock: 18,
    threshold: 7,
    supplier: 'Italian Foods Ltd.'
  }
];
