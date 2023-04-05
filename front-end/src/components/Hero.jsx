import React from "react";
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
                    Lorem Ipsum is simply dummy text of the printing and
                    typesetting industry. Lorem Ipsum has been the industry's
                    standard dummy text ever since the 1500s, when an unknown
                    printer took a galley of type and scrambled it to make a
                    type specimen book.
                  </p>
                  <div>
                    <Button btnName="Discover" />
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
