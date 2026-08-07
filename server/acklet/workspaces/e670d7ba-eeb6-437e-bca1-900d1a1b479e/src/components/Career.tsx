import "./styles/Career.css";

const Career = () => {
  return (
    <div className="career-section section-container">
      <div className="career-container">
        <h2>
          My career <span>&</span>
          <br /> experience
        </h2>
        <div className="career-info">
          <div className="career-timeline">
            <div className="career-dot"></div>
          </div>
          <div className="career-info-box">
            <div className="career-info-in">
              <div className="career-role">
                <h4>Java Developer</h4>
                <h5>Qrious Tech Team LLP · Prahlad Nagar, Ahmedabad</h5>
              </div>
              <h3>2025 – Present</h3>
            </div>
            <p>
              Built and maintained backend services across FinTech, Banking, Food Delivery, Healthcare, and E-commerce. Designed and improved APIs to handle higher traffic, optimized data-fetching processes, and built an AI-powered chatbot using LangChain.
            </p>
          </div>
          <div className="career-info-box">
            <div className="career-info-in">
              <div className="career-role">
                <h4>Software Developer</h4>
                <h5>Group Takey · Ahmedabad</h5>
              </div>
              <h3>2022 – 2024</h3>
            </div>
            <p>
              Improved backend code efficiency and integrated with third-party APIs for projects in School Management and Telecommunication domains, which made the app respond faster and run more reliably.
            </p>
          </div>
          <div className="career-info-box">
            <div className="career-info-in">
              <div className="career-role">
                <h4>Key highlights</h4>
                <h5>Projects & achievements</h5>
              </div>
              <h3>—</h3>
            </div>
            <p>
              Built scalable RESTful APIs handling high traffic (~5K requests/min),
              reduced load by 40% through performance optimization, and improved
              database efficiency by 29% through query and data-access tuning.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Career;
