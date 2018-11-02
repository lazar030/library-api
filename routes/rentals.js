const {Rental, validate} = require('../models/rental'); 
const {Book} = require('../models/book'); 
const {Customer} = require('../models/customer'); 
const mongoose = require('mongoose');
const Fawn = require('fawn');
const express = require('express');
const router = express.Router();

Fawn.init(mongoose);

router.get('/', async (req, res) => {
  const rentals = await Rental.find().sort('-dateOut');
  res.status(200).send(rentals);
});

router.post('/', async (req, res) => {
  const { error } = validate(req.body); 
  if (error) return res.status(400).send(error.details[0].message);

  const customer = await Customer.findById(req.body.customerId);
  if (!customer) return res.status(400).send('Invalid customer.');

  const book = await Book.findById(req.body.bookId);
  if (!book) return res.status(400).send('Invalid book.');

  if (book.numberInStock === 0) return res.status(400).send('Book not in stock.');

  let rental = new Rental({ 
    customer: {
      _id: customer._id,
      name: customer.name, 
      phone: customer.phone
    },
    book: {
      _id: book._id,
      title: book.title,
      rentalRate: book.rentalRate
    },
    rentalFee: book.rentalPrice + 5 // Add 5 to book rentalPrice
  });

  try {
    new Fawn.Task()
      .save('rentals', rental)
      .update('books', { _id: book._id }, { 
        $inc: { numberInStock: -1 }
      })
      .run();
  
    res.status(200).send(rental);
  }
  catch(ex) {
    res.status(500).send('Something failed.');
  }
});

router.get('/:id', async (req, res) => {
  const rental = await Rental.findById(req.params.id);

  if (!rental) return res.status(404).send('The rental with the given ID was not found.');

  res.status(200).send(rental);
});

module.exports = router; 