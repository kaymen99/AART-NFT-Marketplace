import "./../../assets/styles/components/Navbar.css";
import logo from "../../assets/images/logo.png";

import React, { useState } from "react";
import Connect from "./Connect";
import useComponentVisible from "../../hooks/visible";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBars, faClose } from "@fortawesome/free-solid-svg-icons";

function NavBar() {
  const [isNavExpanded, setIsNavExpanded] = useState(false);

  const { ref, isComponentVisible, setIsComponentVisible } =
    useComponentVisible(true, setIsNavExpanded);

  return (
    <header className="header">
      <div className="brand">
        <a href="/" className="brand-logo">
          <img src={logo} width="40px" height="40px" />
        </a>
        <div
          className="nav-burger"
          onClick={() => {
            setIsNavExpanded(true);
          }}
        >
          <FontAwesomeIcon icon={faBars} color="white" size="2x" />
        </div>
      </div>
      <nav
        className={
          isNavExpanded ? "nav-custom open-menu" : "nav-custom is-active"
        }
        ref={ref}
      >
        <div
          className={isNavExpanded ? "nav-cancel" : "nav-cancel is-active"}
          onClick={() => {
            setIsNavExpanded(false);
            setIsComponentVisible(true);
          }}
        >
          <FontAwesomeIcon icon={faClose} color="white" size="2x" />
        </div>
        <div className="nav-links-div">
          <a href="/create-nft" className="nav-link-ref">
            Mint
          </a>
          <a href="/#about" className="nav-link-ref">
            About
          </a>
          <a href="/#roadmap" className="nav-link-ref">
            Roadmap
          </a>
          <a href="/#FAQ" className="nav-link-ref">
            FAQ
          </a>
        </div>
        <Connect />
      </nav>
    </header>
  );
}

export default NavBar;
