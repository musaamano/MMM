import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Lock, Eye, EyeOff, CheckCircle, XCircle, ArrowLeft } from "lucide-react";
import busLogo from "../../assets/bus.png";
import "./forgotPassword.css";
import "./resetPassword.css";
import API_BASE_URL from '../../config.js';

export default function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [tokenValid, setTokenValid] = useState(true);

  const passwordRequirements = {
    length: formData.password.length >= 8,
    uppercase: /[A-Z]/.test(formData.password),
    lowercase: /[a-z]/.test(formData.password),
    number: /[0-9]/.test(formData.password),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(formData.password),
  };

  const allRequirementsMet = Object.values(passwordRequirements).every(Boolean);
  const passwordsMatch = formData.password && formData.password === formData.confirmPassword;

  const getPasswordStrength = () => {
    const metCount = Object.values(passwordRequirements).filter(Boolean).length;
    if (metCount <= 2) return "weak";
    if (metCount <= 4) return "medium";
    return "strong";
  };

  useEffect(() => {
    // Verify token validity
    const verifyToken = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/auth/verify-reset-token/${token}`);
        if (!response.ok) {
          setTokenValid(false);
          setError("Invalid or expired reset link");
        }
      } catch (err) {
        setTokenValid(false);
        setError("Failed to verify reset link");
      }
    };

    if (token) {
      verifyToken();
    }
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!allRequirementsMet) {
      setError("Password does not meet all requirements");
      return;
    }

    if (!passwordsMatch) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password: formData.password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to reset password");
      }

      setSuccess(true);
      setTimeout(() => {
        navigate("/login");
      }, 3000);
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!tokenValid) {
    return (
      <div className="reset-password-page">
        <div className="reset-password-container">
          <div className="reset-password-card">
            <div className="logo-wrapper">
              <img src={busLogo} alt="Haramaya University Logo" className="forgot-logo" />
            </div>
            <h2>Invalid Link</h2>
            <div className="error-message">{error}</div>
            <Link to="/forgot-password" className="back-link">
              Request New Reset Link
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="reset-password-page">
        <div className="reset-password-container">
          <div className="reset-password-card success-card">
            <CheckCircle className="success-icon" />
            <h2>Password Reset Successfully</h2>
            <p className="success-message">
              Your password has been reset successfully.
            </p>
            <p className="success-subtitle">
              Redirecting to login page...
            </p>
            <Link to="/login" className="back-to-login-btn">
              <ArrowLeft size={18} />
              Go to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="reset-password-page">
      <div className="reset-password-container">
        <div className="reset-password-card">
          <div className="logo-wrapper">
            <img src={busLogo} alt="Haramaya University Logo" className="forgot-logo" />
          </div>

          <h2>Reset Password</h2>
          <p className="subtitle">Enter your new password</p>

          {error && <div className="error-message">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="input-group">
              <Lock className="input-icon" size={20} />
              <div className="password-input-wrapper">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="New Password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  disabled={loading}
                  style={{ paddingRight: "44px" }}
                />
                <button
                  type="button"
                  className="toggle-password"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {formData.password && (
              <div className="password-strength">
                <div className="strength-label">
                  Password Strength: <strong>{getPasswordStrength().toUpperCase()}</strong>
                </div>
                <div className="strength-bar">
                  <div className={`strength-fill ${getPasswordStrength()}`}></div>
                </div>
              </div>
            )}

            <div className="password-requirements">
              <h4>Password must contain:</h4>
              <div className={passwordRequirements.length ? "requirement-item met" : "requirement-item"}>
                {passwordRequirements.length ? <CheckCircle className="requirement-icon" /> : <XCircle className="requirement-icon" />}
                At least 8 characters
              </div>
              <div className={passwordRequirements.uppercase ? "requirement-item met" : "requirement-item"}>
                {passwordRequirements.uppercase ? <CheckCircle className="requirement-icon" /> : <XCircle className="requirement-icon" />}
                One uppercase letter
              </div>
              <div className={passwordRequirements.lowercase ? "requirement-item met" : "requirement-item"}>
                {passwordRequirements.lowercase ? <CheckCircle className="requirement-icon" /> : <XCircle className="requirement-icon" />}
                One lowercase letter
              </div>
              <div className={passwordRequirements.number ? "requirement-item met" : "requirement-item"}>
                {passwordRequirements.number ? <CheckCircle className="requirement-icon" /> : <XCircle className="requirement-icon" />}
                One number
              </div>
              <div className={passwordRequirements.special ? "requirement-item met" : "requirement-item"}>
                {passwordRequirements.special ? <CheckCircle className="requirement-icon" /> : <XCircle className="requirement-icon" />}
                One special character
              </div>
            </div>

            <div className="input-group">
              <Lock className="input-icon" size={20} />
              <div className="password-input-wrapper">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm Password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  disabled={loading}
                  style={{ paddingRight: "44px" }}
                />
                <button
                  type="button"
                  className="toggle-password"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {formData.confirmPassword && (
                <div className={`validation-message ${passwordsMatch ? "success" : "error"}`}>
                  {passwordsMatch ? "Passwords match" : "Passwords do not match"}
                </div>
              )}
            </div>

            <button 
              type="submit" 
              disabled={loading || !allRequirementsMet || !passwordsMatch} 
              className="submit-btn"
            >
              {loading ? "Resetting..." : "Reset Password"}
            </button>
          </form>

          <Link to="/login" className="back-link">
            <ArrowLeft size={16} />
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}
