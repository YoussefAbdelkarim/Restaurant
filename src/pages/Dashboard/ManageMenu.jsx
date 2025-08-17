
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import './ManageMenu.css';

const categoryImages = {
  pizza: 'pizza.jpg',
  burger: 'burgers.jpg',
  fries: 'fries.jpg',
  drink: 'drink.jpg',
  dessert: 'dessert.jpg',
  other: 'other.jpg',
  plate: 'plate.jpg',
  sandwich: 'sandwich.jpg',
};
const categories = ['pizza', 'burger', 'fries', 'drink', 'dessert', 'other', 'plate', 'sandwich'];

export default function ManageMenu() {
  const [menu, setMenu] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDish, setSelectedDish] = useState(null);

  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    available: 'yes',
    category: categories[0],
    ingredients: '',
    photo: null,
  });

  // New state for Edit Modal
  const [showEditForm, setShowEditForm] = useState(false);
  const [editFormData, setEditFormData] = useState({
    _id: '',
    name: '',
    price: '',
    available: 'yes',
    category: '',
    ingredients: '',
    photo: null,
  });

  useEffect(() => {
    fetchMenu();
  }, []);

  const fetchMenu = () => {
    const token = localStorage.getItem('token');
    fetch('/api/items', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch menu');
        return res.json();
      })
      .then((data) => {
        setMenu(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  };

  // EDIT HANDLERS

  const handleEdit = (item) => {
    setEditFormData({
      _id: item._id,
      name: item.name,
      price: item.price,
      available: item.isAvailable ? 'yes' : 'no',
      category: item.category,
      ingredients: item.ingredients ? item.ingredients.join(', ') : '',
      photo: null, // reset photo input for edit
    });
    setShowEditForm(true);
  };

  const handleEditInputChange = (e) => {
    const { name, value, files } = e.target;
    if (name === 'photo') {
      setEditFormData((prev) => ({ ...prev, photo: files[0] }));
    } else {
      setEditFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleEditItemSubmit = (e) => {
    e.preventDefault();

    if (
      !editFormData.name.trim() ||
      editFormData.price === '' ||
      isNaN(parseFloat(editFormData.price)) ||
      !editFormData.ingredients.trim()
    ) {
      alert('Please fill all fields correctly.');
      return;
    }

    const token = localStorage.getItem('token');
    const data = new FormData();
    data.append('name', editFormData.name.trim());
    data.append('price', parseFloat(editFormData.price));
    data.append('isAvailable', editFormData.available === 'yes');
    data.append('ingredients', editFormData.ingredients.trim());
    if (editFormData.photo) {
      data.append('photo', editFormData.photo);
    }

    fetch(`/api/items/${editFormData._id}`, {
      method: 'PUT', // or PATCH if your API prefers
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: data,
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to update item');
        return res.json();
      })
      .then((updatedItem) => {
        setMenu((prev) =>
          prev.map((item) => (item._id === updatedItem._id ? updatedItem : item))
        );
        setShowEditForm(false);
      })
      .catch((err) => alert(err.message));
  };

  // DELETE
  const handleDelete = (itemId) => {
    if (!window.confirm('Are you sure you want to delete this dish?')) return;
    const token = localStorage.getItem('token');

    fetch(`/api/items/${itemId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to delete item');
        setMenu((prev) => prev.filter((item) => item._id !== itemId));
      })
      .catch((err) => alert(err.message));
  };

  // DETAILS MODAL
  const handleShowDetails = (dish) => {
    setSelectedDish(dish);
  };

  const handleCloseDetails = () => {
    setSelectedDish(null);
  };

  // ADD MODAL HANDLERS
  const handleInputChange = (e) => {
    const { name, value, type, files } = e.target;
    if (type === 'file') {
      setFormData((prev) => ({ ...prev, [name]: files[0] }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleAddItemSubmit = (e) => {
    e.preventDefault();

    if (
      !formData.name.trim() ||
      formData.price === '' ||
      isNaN(parseFloat(formData.price)) ||
      !formData.category ||
      !formData.ingredients.trim() ||
      !formData.photo
    ) {
      alert('Please fill all fields correctly.');
      return;
    }

    const token = localStorage.getItem('token');
    const data = new FormData();
    data.append('name', formData.name.trim());
    data.append('price', parseFloat(formData.price));
    data.append('isAvailable', formData.available === 'yes');
    data.append('category', formData.category);
    data.append('ingredients', formData.ingredients.trim());
    data.append('photo', formData.photo);

    fetch('/api/items', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: data,
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to add item');
        return res.json();
      })
      .then((newItem) => {
        setMenu((prev) => [...prev, newItem]);
        setShowAddForm(false);
        setFormData({
          name: '',
          price: '',
          available: 'yes',
          category: categories[0],
          ingredients: '',
          photo: null,
        });
      })
      .catch((err) => alert(err.message));
  };

  if (loading) return <p>Loading menu...</p>;
  if (error) return <p>Error: {error}</p>;

  const groupedByCategory = menu.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  return (
    <div className="manage-menu-container">
      <div className="top-bar">
        <h2 className="manage-menu-title">Manage Restaurant Menu</h2>

        <button className="add-item-btn" onClick={() => setShowAddForm(true)}>
          + Add Item
        </button>
      </div>

      {Object.entries(groupedByCategory).map(([category, items]) => (
        <div key={category} className="category-section">
          <ul className="dishes-list">
            {items.map((item) => (
              <li
                key={item._id}
                className="dish-item clickable"
                onClick={() => handleShowDetails(item)}
              >
                <span>
                  {item.name} - ${item.price.toFixed(2)}
                </span>
                <div className="dish-buttons">
                  <button
                    className="edit"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEdit(item);
                    }}
                  >
                    Edit
                  </button>
                  <button
                    className="delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(item._id);
                    }}
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>

          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 1 }}
          >
                         <img
               className="category-image"
               src={`/images/${categoryImages[category] || 'pizza.jpg'}`}
               alt={`${category} category`}
               onError={(e) => {
                 e.target.src = '/images/pizza.jpg'; // fallback to pizza image
               }}
             />
          </motion.div>
        </div>
      ))}

      {/* Add Item Modal */}
      {showAddForm && (
        <div className="modal-back" onClick={() => setShowAddForm(false)}>
          <form
            className="modal-cont"
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleAddItemSubmit}
          >
            <div className="modal-head">
              <h2>Add New Dish</h2>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setShowAddForm(false)}
                aria-label="Close modal"
              >
                &times;
              </button>
            </div>

            <label>
              Name:
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                autoFocus
              />
            </label>

            <label>
              Price:
              <input
                type="number"
                step="0.01"
                name="price"
                value={formData.price}
                onChange={handleInputChange}
                required
              />
            </label>

            <label>
              Available:
              <select
                name="available"
                value={formData.available}
                onChange={handleInputChange}
              >
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </label>

            <label>
              Category:
              <select
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                required
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Ingredients:
              <textarea
                name="ingredients"
                value={formData.ingredients}
                onChange={handleInputChange}
                required
                placeholder="Separate ingredients by commas"
              />
            </label>

            <label>
              Photo:
              <input
                type="file"
                name="photo"
                accept="image/*"
                onChange={handleInputChange}
                required
              />
            </label>

            <div className="modal-buttons">
              <button type="submit" style={{ backgroundColor: 'green', color: 'white' }}>Add</button>
              <button type="button" onClick={() => setShowAddForm(false)}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Item Modal */}
      {showEditForm && (
        <div className="modal-back" onClick={() => setShowEditForm(false)}>
          <form
            className="modal-cont"
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleEditItemSubmit}
          >
            <div className="modal-head">
              <h2 style={{color: 'green'}}>Edit Dish</h2>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setShowEditForm(false)}
                aria-label="Close modal"
              >
                &times;
              </button>
            </div>

            <label>
              Name:
              <input
                type="text"
                name="name"
                value={editFormData.name}
                onChange={handleEditInputChange}
                required
                autoFocus
              />
            </label>

            <label>
              Price:
              <input
                type="number"
                step="0.01"
                name="price"
                value={editFormData.price}
                onChange={handleEditInputChange}
                required
              />
            </label>

            <label>
              Available:
              <select
                name="available"
                value={editFormData.available}
                onChange={handleEditInputChange}
              >
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </label>

            <label>
              Category:
              <input
                type="text"
                value={editFormData.category}
                disabled
                style={{ backgroundColor: '#eee', cursor: 'not-allowed' }}
              />
            </label>

            <label>
              Ingredients:
              <textarea
                name="ingredients"
                value={editFormData.ingredients}
                onChange={handleEditInputChange}
                required
                placeholder="Separate ingredients by commas"
              />
            </label>

            <label>
              Photo:
              <input
                type="file"
                name="photo"
                accept="image/*"
                onChange={handleEditInputChange}
              />
            </label>

            <div className="modal-buttons">
              <button type="submit" style={{ backgroundColor: 'green', color: 'white' }} >Save</button>
              <button type="button" onClick={() => setShowEditForm(false)}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Dish Details Modal */}
      {selectedDish && (
        <div
          className="modal-backdrop"
          onClick={handleCloseDetails}
          style={{ background: 'rgba(252, 249, 249, 0.5)' }}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-details" style={{ flex: 1 }}>
              <h3>{selectedDish.name}</h3>
              <p>
                <strong>Price:</strong> ${selectedDish.price.toFixed(2)}
              </p>
              <p>
                <strong>Category:</strong> {selectedDish.category}
              </p>
              <p>
                <strong>Available:</strong> {selectedDish.isAvailable ? 'Yes' : 'No'}
              </p>
              <p>
                <strong>Sold Count:</strong> {selectedDish.soldCount}
              </p>
              <p>
                <strong>Ingredients:</strong> {selectedDish.ingredients?.join(', ')}
              </p>
              <button onClick={handleCloseDetails}>Close</button>
            </div>
                         <div className="modal-image" style={{ flexShrink: 0, width: '220px' }}>
               <img
                 src={selectedDish.imageUrl ? `/images/${selectedDish.imageUrl}` : `/images/${categoryImages[selectedDish.category] || 'pizza.jpg'}`}
                 alt={selectedDish.name}
                 style={{ width: '100%', borderRadius: '10px' }}
                 onError={(e) => {
                   e.target.src = `/images/${categoryImages[selectedDish.category] || 'pizza.jpg'}`;
                 }}
               />
             </div>
          </div>
        </div>
      )}
    </div>
  );
}