import images from "../assets/images";
import "../assets/styles/components/Services.css";

const Services = () => {
  return (
    <section className="service" id="services">
      <div className="container">
        <div className="row">
          <div className="col-12">
            <div className="service-bx wow zoomIn">
              <h2>Services</h2>
              <p>
                Explore our range of cutting-edge services designed to elevate
                your AI NFT experience.
              </p>
              <section className="features-icons text-center">
                <div className="container">
                  <div className="row">
                    <div className="col-lg-4">
                      <div className="features-icons-item mx-auto mb-5 mb-lg-0 mb-lg-3">
                        <div className="features-icons-icon">
                          <img
                            src={images.service1}
                            alt="Filter & Discover"
                            style={{ width: "50px", height: "50px" }}
                          />
                        </div>
                        <h4>AI-Generated NFT</h4>
                        <p className="lead mb-0">
                          Easily create your own AI-generated artworks and
                          tokenize them on our platform
                        </p>
                      </div>
                    </div>
                    <div className="col-lg-4">
                      <div className="features-icons-item mx-auto mb-5 mb-lg-0 mb-lg-3">
                        <div className="features-icons-icon">
                          <img
                            src={images.service2}
                            alt="Filter & Discover"
                            style={{ width: "50px", height: "50px" }}
                          />
                        </div>
                        <h4>NFT Sales</h4>
                        <p className="lead mb-0">
                          Buy and sell unique AI-generated NFTs securely on our
                          marketplace.
                        </p>
                      </div>
                    </div>
                    <div className="col-lg-4">
                      <div className="features-icons-item mx-auto mb-0 mb-lg-3">
                        <div className="features-icons-icon">
                          <img
                            src={images.service3}
                            alt="Filter & Discover"
                            style={{ width: "50px", height: "50px" }}
                          />
                        </div>
                        <h4>Auction Platform</h4>
                        <p className="lead mb-0">
                          Participate in exciting auctions to acquire unique
                          AI-generated NFTs.
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="row">
                    <div className="col-lg-4">
                      <div className="features-icons-item mx-auto mb-5 mb-lg-0 mb-lg-3">
                        <div className="features-icons-icon">
                          <img
                            src={images.service4}
                            alt="Filter & Discover"
                            style={{ width: "50px", height: "50px" }}
                          />
                        </div>
                        <h4>NFT Royalties</h4>
                        <p className="lead mb-0">
                          Creators earn royalties whenever their NFTs are resold
                          on the marketplace.
                        </p>
                      </div>
                    </div>
                    <div className="col-lg-4">
                      <div className="features-icons-item mx-auto mb-5 mb-lg-0 mb-lg-3">
                        <div className="features-icons-icon">
                          <i className="fab fa-github"></i>
                          <img
                            src={images.service3}
                            alt="Filter & Discover"
                            style={{ width: "50px", height: "50px" }}
                          />
                        </div>
                        <h4>Creator NFT Profiles</h4>
                        <p className="lead mb-0">
                          Create and mint your personalized creator profile NFT.
                        </p>
                      </div>
                    </div>
                    <div className="col-lg-4">
                      <div className="features-icons-item mx-auto mb-0 mb-lg-3">
                        <div className="features-icons-icon">
                          <img
                            src={images.service1}
                            alt="Filter & Discover"
                            style={{ width: "50px", height: "50px" }}
                          />
                        </div>
                        <h4>Secure Marketplace</h4>
                        <p className="lead mb-0">
                          Enjoy a safe and reliable trading environment, backed
                          by blockchain technology.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Services;
