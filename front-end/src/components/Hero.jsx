import React from "react";
import { Link } from 'react-router-dom';
import "animate.css";
import "../assets/styles/components/Hero.css";
import { Container, Row, Col } from "react-bootstrap";
import TrackVisibility from "react-on-screen";
import Typewriter from "typewriter-effect";
import Button from "./Button";

function Hero() {
  return (
    <section className="hero">
      <Container>
        <Row className="aligh-items-center">
          <Col xs={12} md={6} xl={7}>
            <TrackVisibility>
              {({ isVisible }) => (
                <div
                  className={
                    isVisible ? "animate__animated animate__fadeIn" : ""
                  }
                >
                  <span className="tagline">Welcome to AART</span>
                  <h1>
                    <Typewriter
                      options={{
                        autoStart: true,
                        loop: true,
                      }}
                      onInit={(typewriter) => {
                        typewriter
                          .typeString(
                            `<span class='txt-rotate'>Mint, Earn Royalties On</span>`
                          )
                          .pauseFor(2000)
                          .deleteAll()
                          .typeString(
                            `<span class='txt-rotate'>Buy, Sell & trader</span>`
                          )
                          .pauseFor(2000)
                          .deleteAll()
                          .typeString(
                            `<span class='txt-rotate'>Auction Your</span>`
                          )
                          .pauseFor(2000)
                          .deleteAll()
                          .start();
                      }}
                    />
                    AI generated Art
                  </h1>
                  <p>
                    Discover, Collect, and Trade AI-powered NFTs on our
                    Marketplace. Explore unique artwork, join thrilling
                    auctions, and seize exclusive offers in the world of
                    AI-driven creativity.
                  </p>
                  <div>
                    <Link to="/collection">
                      <Button btnName="Discover" />
                    </Link>
                  </div>
                </div>
              )}
            </TrackVisibility>
          </Col>
          <Col xs={12} md={6} xl={5}>
            <TrackVisibility>
              {({ isVisible }) => (
                <div
                  className={
                    isVisible ? "animate__animated animate__zoomIn" : ""
                  }
                >
                  <img
                    src="https://images.cointelegraph.com/images/1434_aHR0cHM6Ly9zMy5jb2ludGVsZWdyYXBoLmNvbS91cGxvYWRzLzIwMjEtMDYvNGE4NmNmOWQtODM2Mi00YmVhLThiMzctZDEyODAxNjUxZTE1LmpwZWc=.jpg"
                    alt="NFT Art"
                  />
                </div>
              )}
            </TrackVisibility>
          </Col>
        </Row>
      </Container>
    </section>
  );
}

export default Hero;
