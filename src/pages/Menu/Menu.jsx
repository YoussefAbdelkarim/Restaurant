import React from 'react';
import './Menu.css';
import { Card, CardBody, CardText, CardTitle } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import DessertImg from '../../utils/images/dessert-img.jpg';
import DrinksImg from '../../utils/images/drinks-img.jpg';
import pizza from '../../utils/pizza.js';
import burger from '../../utils/burger.js';
import fries from '../../utils/fries.js';
import dessert from '../../utils/dessert';
import drink from '../../utils/drink';
import Pizza from '../../utils/images/pizza.jpg';
import Fries from '../../utils/images/Fries.jpg';
import Burger from '../../utils/images/burgers.jpg';
import '../../components/button.css';

function Menu() {
  return (
    <div className='menu-page'>
      <header className='height-50 mt-5'>
        <motion.div 
          className='container h-100 d-flex align-items-center justify-content-center'
          initial={{ opacity: 0, y: -50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
        >
          <h1 className='text-light'>Menu</h1>
        </motion.div>
      </header>

      <div className='breakfast my-5'>
        <div className='container'>
          <h2 className='text-center fs-1 mb-4 mb-lg-5 text-uppercase fw-bold text-danger' >Pizza</h2>
          <div className='row flex-column-reverse flex-lg-row'>
            <motion.div 
              className='col-lg-6 d-flex justify-content-center'
              initial={{ opacity: 0, x: -300 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 1 }}
            >
              <img src={Pizza} className='img-fluid w-75 mt-4 mt-lg-0' alt="" />
            </motion.div>
            <motion.div 
              className='col-lg-6 d-flex flex-column justify-content-around'
              initial={{ opacity: 0, x: 350 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 1 }}
            >
              {pizza.map((pizza) => (
                <div key={pizza.id}>
                  <Card className='border-0'>
                    <CardBody>
                      <CardTitle className='text-center fs-3 text-capitalize'>
                        {pizza.name}
                      </CardTitle>
                      <CardText className='text-center fs-5'>
                        {pizza.description}
                      </CardText>
                      <CardText className='text-center fs-3 fw-bold text-danger'>
                        {pizza.price}
                      </CardText>
                    </CardBody>
                  </Card>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </div>

      <div className='lunch bg-dark text-light py-5'>
        <div className='container'>
          <h2 className='text-center fs-1 mb-4 mb-lg-5 text-uppercase fw-bold text-danger' >Burger</h2>
          <div className='row'>
            <motion.div 
              className='col-lg-6 d-flex flex-column justify-content-around'
              initial={{ opacity: 0, x: -300 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 1 }}
            >
              {burger.map((burger) => (
                <div key={burger.id}>
                  <Card className='border-0 bg-dark text-light'>
                    <CardBody>
                      <CardTitle className='text-center fs-3 text-capitalize'>
                        {burger.name}
                      </CardTitle>
                      <CardText className='text-center fs-5'>
                        {burger.description}
                      </CardText>
                      <CardText className='text-center fs-3 fw-bold text-danger'>
                        {burger.price}
                      </CardText>
                    </CardBody>
                  </Card>
                </div>
              ))}
            </motion.div>
            <motion.div 
              className='col-lg-6 d-flex justify-content-center'
              initial={{ opacity: 0, x: 350 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 1 }}
            >
              <img src={Burger} className='img-fluid w-75 mt-4 mt-lg-0' alt="" />
            </motion.div>
          </div>
        </div>
      </div>

      <div className='dinner my-5'>
        <div className='container'>
          <h2 className='text-center fs-1 mb-4 mb-lg-5 text-uppercase fw-bold text-danger' >French Fries</h2>
          <div className='row flex-column-reverse flex-lg-row'>
            <motion.div 
              className='col-lg-6 d-flex justify-content-center'
              initial={{ opacity: 0, x: -300 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 1 }}
            >
              <img src={Fries} className='img-fluid w-75 mt-4 mt-lg-0' alt="" />
            </motion.div>
            <motion.div 
              className='col-lg-6 d-flex flex-column justify-content-around'
              initial={{ opacity: 0, x: 350 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 1 }}
            >
              {fries.map((fries) => (
                <div key={fries.id}>
                  <Card className='border-0'>
                    <CardBody>
                      <CardTitle className='text-center fs-3 text-capitalize'>
                        {fries.name}
                      </CardTitle>
                      <CardText className='text-center fs-5'>
                        {fries.description}
                      </CardText>
                      <CardText className='text-center fs-3 fw-bold text-danger' >
                        {fries.price}
                      </CardText>
                    </CardBody>
                  </Card>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </div>

      <div className='dessert bg-dark text-light py-5'>
        <div className='container'>
          <h2 className='text-center fs-1 mb-4 mb-lg-5 text-uppercase fw-bold text-danger' >Dessert</h2>
          <div className='row'>
            <motion.div 
              className='col-lg-6 d-flex flex-column justify-content-around'
              initial={{ opacity: 0, x: -300 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 1 }}
            >
              {dessert.map((dessert) => (
                <div key={dessert.id}>
                  <Card className='border-0 bg-dark text-light'>
                    <CardBody>
                      <CardTitle className='text-center fs-3 text-capitalize'>
                        {dessert.name}
                      </CardTitle>
                      <CardText className='text-center fs-5'>
                        {dessert.description}
                      </CardText>
                      <CardText className='text-center fs-3 fw-bold text-danger'>
                        {dessert.price}
                      </CardText>
                    </CardBody>
                  </Card>
                </div>
              ))}
            </motion.div>
            <motion.div 
              className='col-lg-6 d-flex justify-content-center'
              initial={{ opacity: 0, x: 350 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 1 }}
            >
              <img src={DessertImg} className='img-fluid w-75 mt-4 mt-lg-0' alt="" />
            </motion.div>
          </div>
        </div>
      </div>

      <div className='drinks my-5'>
        <div className='container'>
          <h2 className='text-center fs-1 mb-4 mb-lg-5 text-uppercase fw-bold text-danger'>Drinks</h2>
          <div className='row flex-column-reverse flex-lg-row'>
            <motion.div 
              className='col-lg-6 d-flex justify-content-center'
              initial={{ opacity: 0, x: -300 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 1 }}
            >
              <img src={DrinksImg} className='img-fluid w-75 mt-4 mt-lg-0' alt="" />
            </motion.div>
            <motion.div 
              className='col-lg-6 d-flex flex-column justify-content-around'
              initial={{ opacity: 0, x: 350 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 1 }}
            >
              {drink.map((drink) => (
                <div key={drink.id}>
                  <Card className='border-0'>
                    <CardBody>
                      <CardTitle className='text-center fs-3 text-capitalize'>
                        {drink.name}
                      </CardTitle>
                      <CardText className='text-center fs-3 fw-bold text-danger'>
                        {drink.price}
                      </CardText>
                    </CardBody>
                  </Card>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </div>

      <motion.div 
        className="container my-5 pt-5 d-flex justify-content-center"
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 1 }}
      >
        <Link to='/contact'>
          <button type='button' className='custom-btn'>Book your table</button>
        </Link>
      </motion.div>
    </div>
  )
}

export default Menu;