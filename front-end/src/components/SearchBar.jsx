import React, { useState } from "react";
import "../assets/styles/components/SearchBar.css";
import { FaFilter } from "react-icons/fa";
import { BsSearch } from "react-icons/bs";
import { AiOutlineClose } from "react-icons/ai";

import { Modal } from "react-bootstrap";

const SearchBar = () => {
  const [show, setShow] = useState(false);

  const handleClose = () => setShow(false);
  const handleShow = () => setShow(true);

  return (
    <div className="search-form">
      <div className="search-form-formGroup">
        <input type="text" placeholder="Type yout keyword..." />
        <BsSearch className="search-form-icons" />
      </div>
      <button className="filter-btn" onClick={handleShow}>
        <FaFilter /> <span>Filter</span>
      </button>
      <Modal className="dark-modal" show={show} onHide={handleClose}>
        <Modal.Header>
          <Modal.Title>Filters</Modal.Title>
          <AiOutlineClose onClick={handleClose} />
        </Modal.Header>
        <Modal.Body>
          <form className="writeForm" autoComplete="off">
            <div className="filter-input">
              <label>By Creator</label>
              <input type="text" placeholder="Item Name" autoFocus={true} />
            </div>
            <div className="price-input">
              <label>By Price Range</label>
              <div className="price-range">
                <span>Min</span>
                <input type="number" min="0" placeholder="0" autoFocus={true} />
                <span>Max</span>
                <input
                  type="number"
                  min="0"
                  placeholder="1000"
                  autoFocus={true}
                />
              </div>
            </div>
            <div className="filter-input">
              <label>By Category</label>
              <select>
                <option>Art</option>
                <option>Photography</option>
                <option>Sports</option>
                <option>Collectibles</option>
                <option>Trading Cards</option>
                <option>Utility</option>
              </select>
            </div>
          </form>
        </Modal.Body>
        <Modal.Footer>
          <div className="writeForm">
            <button>Apply</button>
          </div>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default SearchBar;
