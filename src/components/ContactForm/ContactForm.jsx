import React, { useState } from 'react';
import './ContactForm.css';
import Form from 'react-bootstrap/Form';
import Col from 'react-bootstrap/Col';
import Button from 'react-bootstrap/Button';
import ValidFeedback from './ValidFeedback';
import InvalidFeedback from './InvalidFeedback';
import { motion } from 'framer-motion';
import '../button.css';

function ContactForm() {
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [emailAddress, setEmailAddress] = useState('');
    const [date, setDate] = useState('');
    const [numberOfGuests, setNumberOfGuests] = useState('');
    const [comments, setComments] = useState('');
    const [validated, setValidated] = useState(false);

    const todayDate = new Date().toISOString().split("T")[0]; // YYYY-MM-DD format

    const handleSubmit = (event) => {
        const form = event.currentTarget;
        if (form.checkValidity() === false) {
            event.preventDefault();
            event.stopPropagation();
        } else {
            event.preventDefault();
            event.stopPropagation();

            document.getElementById('results').innerHTML = `
                <div class="modal" id="modal">
                    <div class="modal-dialog d-flex align-items-center">
                        <div class="modal-content rounded-0">
                            <div class="modal-header">
                                <h5 class="modal-title">Thank You!</h5>
                            </div>
                            <div class="modal-body">
                                <p>Dear ${firstName} ${lastName},</p>
                                <p>Thank you for your reservation for ${numberOfGuests} people on ${date}. You will receive a confirmation email shortly on ${emailAddress}.</p>
                                <p>See you soon!</p>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-success btn-lg rounded-0" data-bs-dismiss="modal" onClick="window.location.reload()">Close</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }
        setValidated(true);
    };

    return (
        <motion.div
            initial={{ opacity: 0, x: 350 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 1 }}
        >
            <Form 
                noValidate 
                validated={validated} 
                className="bg-dark text-light p-5 text-white" 
                id="form" 
                onSubmit={handleSubmit}
            >
                <Form.Group className="row mb-3">
                    <Col md={6}>
                        <Form.Label htmlFor="first-name" className="text-capitalize text-white">First name</Form.Label>
                        <Form.Control
                            className='rounded-0'
                            type="text"
                            name="first-name"
                            id="first-name"
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            pattern="^[A-Za-z]+$"
                            title="Only letters are allowed"
                            required
                        />
                        <ValidFeedback />
                        <InvalidFeedback message='Please enter a valid first name (letters only).' />
                    </Col>
                    <Col md={6}>
                        <Form.Label htmlFor="last-name" className="text-capitalize text-white">Last name</Form.Label>
                        <Form.Control
                            className='rounded-0'
                            type="text"
                            name="last-name"
                            id="last-name"
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            pattern="^[A-Za-z]+$"
                            title="Only letters are allowed"
                            required
                        />
                        <ValidFeedback />
                        <InvalidFeedback message='Please enter a valid last name (letters only).' />
                    </Col>
                </Form.Group>

                <Form.Group className="row mb-3">
                    <Col md={6}>
                        <Form.Label htmlFor="phone-number" className="text-capitalize text-white">Phone number</Form.Label>
                        <Form.Control
                            className='rounded-0'
                            type="tel"
                            name="phone-number"
                            id="phone-number"
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value)}
                            pattern="^[0-9]{10,15}$"
                            title="Enter a valid phone number (10-15 digits)"
                            required
                        />
                        <ValidFeedback />
                        <InvalidFeedback message='Please enter a valid phone number (10-15 digits).' />
                    </Col>
                    <Col md={6}>
                        <Form.Label htmlFor="email" className="text-capitalize text-white">Email address</Form.Label>
                        <Form.Control
                            className='rounded-0'
                            type="email"
                            name="email"
                            id="email"
                            value={emailAddress}
                            onChange={(e) => setEmailAddress(e.target.value)}
                            required
                        />
                        <ValidFeedback />
                        <InvalidFeedback message='Please enter a valid email address.' />
                    </Col>
                </Form.Group>

                <Form.Group className="row mb-3">
                    <Col md={6}>
                        <Form.Label htmlFor="date" className="text-capitalize text-white">Date</Form.Label>
                        <Form.Control
                            className='rounded-0'
                            type="date"
                            name="date"
                            id="date"
                            min={todayDate}
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            required
                        />
                        <ValidFeedback />
                        <InvalidFeedback message='Please choose a valid date (today or future).' />
                    </Col>
                    <Col md={6}>
                        <Form.Label htmlFor="guests" className="text-capitalize text-white">Number of guests</Form.Label>
                        <Form.Control
                            className='rounded-0'
                            type="number"
                            name="guests"
                            id="guests"
                            min="1"
                            value={numberOfGuests}
                            onChange={(e) => setNumberOfGuests(e.target.value)}
                            required
                        />
                        <ValidFeedback />
                        <InvalidFeedback message='Number of guests must be at least 1.' />
                    </Col>
                </Form.Group>

                <Form.Group className="mb-3">
                    <Form.Label htmlFor="comments" className="text-capitalize text-white">Comments</Form.Label>
                    <Form.Control
                        className='rounded-0 text-white'
                        as="textarea"
                        name="comments"
                        cols={20}
                        rows={3}
                        id="comments"
                        value={comments}
                        onChange={(e) => setComments(e.target.value)}
                    />
                </Form.Group>

                <Button variant="primary" type="submit" className='custom-btn' id="submit-btn">
                    Submit
                </Button>
            </Form>

            <div id="results"></div>
        </motion.div>
    );
}

export default ContactForm;
