import { MdArrowOutward, MdCopyright } from "react-icons/md";
import "./styles/Contact.css";

const Contact = () => {
  return (
    <div className="contact-section section-container" id="contact">
      <div className="contact-container">
        <h3>Contact</h3>
        <div className="contact-flex">
          <div className="contact-box">
            <h4>Connect</h4>
            <p>
              <a
                href="https://www.linkedin.com/in/athar-taj-b9035931b"
                target="_blank"
                rel="noreferrer"
                data-cursor="disable"
              >
                LinkedIn — athar-taj
              </a>
            </p>
            <p data-cursor="disable">Email — contact.athar.taj@gmail.com</p>
            <p data-cursor="disable">Phone — +91 987 519 2829</p>
            <p data-cursor="disable">Ahmedabad, Gujarat (380021)</p>
            <h4>Education</h4>
            <p>
              B.Tech. in Information Technology — L.J. University, Ahmedabad
            </p>
            <p>
              B.E. Diploma in Information Technology — Silver Oak University, Ahmedabad
            </p>
            <p>
              Secondary School (GSEB) — Seth A.H. Sarasvati School, Ahmedabad
            </p>
          </div>
          <div className="contact-box">
            <h4>Social</h4>
            <a
              href="https://github.com/athar-taj"
              target="_blank"
              rel="noreferrer"
              data-cursor="disable"
              className="contact-social"
            >
              GitHub <MdArrowOutward />
            </a>
            <a
              href="https://www.linkedin.com/in/athar-taj-b9035931b"
              target="_blank"
              rel="noreferrer"
              data-cursor="disable"
              className="contact-social"
            >
              LinkedIn <MdArrowOutward />
            </a>
          </div>
          <div className="contact-box">
            <h2>
              Designed and Developed <br /> by <span>Athar Taj</span>
            </h2>
            <h5>
              <MdCopyright /> 2026
            </h5>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contact;
