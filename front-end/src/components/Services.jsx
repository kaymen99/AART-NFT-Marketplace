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
                Lorem Ipsum is simply dummy text of the printing and typesetting
                industry.<br></br> Lorem Ipsum has been the industry's standard
                dummy text.
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
                            style={{ width: "60px", height: "60px" }}
                          />
                        </div>
                        <h4>Fully Responsive</h4>
                        <p className="lead mb-0">
                          This theme will look great on any device, no matter
                          the size!
                        </p>
                      </div>
                    </div>
                    <div className="col-lg-4">
                      <div className="features-icons-item mx-auto mb-5 mb-lg-0 mb-lg-3">
                        <div className="features-icons-icon">
                          <img
                            src={images.service2}
                            alt="Filter & Discover"
                            style={{ width: "60px", height: "60px" }}
                          />
                        </div>
                        <h4>Bootstrap 5 Ready</h4>
                        <p className="lead mb-0">
                          Featuring the latest build of the new Bootstrap 5
                          framework!
                        </p>
                      </div>
                    </div>
                    <div className="col-lg-4">
                      <div className="features-icons-item mx-auto mb-0 mb-lg-3">
                        <div className="features-icons-icon">
                          <img
                            src={images.service3}
                            alt="Filter & Discover"
                            style={{ width: "60px", height: "60px" }}
                          />
                        </div>
                        <h4>Easy to Use</h4>
                        <p className="lead mb-0">
                          Ready to use with your own content, or customize the
                          source files!
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="row">
                    <div className="col-lg-4">
                      <div className="features-icons-item mx-auto mb-5 mb-lg-0 mb-lg-3">
                        <div className="features-icons-icon">
                          <img
                            src={images.service1}
                            alt="Filter & Discover"
                            style={{ width: "60px", height: "60px" }}
                          />
                        </div>
                        <h4>Fully Responsive</h4>
                        <p className="lead mb-0">
                          This theme will look great on any device, no matter
                          the size!
                        </p>
                      </div>
                    </div>
                    <div className="col-lg-4">
                      <div className="features-icons-item mx-auto mb-5 mb-lg-0 mb-lg-3">
                        <div className="features-icons-icon">
                          <img
                            src={images.service2}
                            alt="Filter & Discover"
                            style={{ width: "60px", height: "60px" }}
                          />
                        </div>
                        <h4>Bootstrap 5 Ready</h4>
                        <p className="lead mb-0">
                          Featuring the latest build of the new Bootstrap 5
                          framework!
                        </p>
                      </div>
                    </div>
                    <div className="col-lg-4">
                      <div className="features-icons-item mx-auto mb-0 mb-lg-3">
                        <div className="features-icons-icon">
                          <img
                            src={images.service3}
                            alt="Filter & Discover"
                            style={{ width: "60px", height: "60px" }}
                          />
                        </div>
                        <h4>Easy to Use</h4>
                        <p className="lead mb-0">
                          Ready to use with your own content, or customize the
                          source files!
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
