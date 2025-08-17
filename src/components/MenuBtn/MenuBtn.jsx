import React from 'react';
import { Link } from 'react-router-dom';
import '../button.css';

function MenuBtn() {
  return (
    <Link to='/menu'>
        <button type='button' className='custom-btn'>Our full menu</button>
    </Link>
  )
}

export default MenuBtn;