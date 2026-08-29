// Central API base URL — driven by VITE_API_URL at build time.
// Set VITE_API_URL in your .env (dev) or in your hosting platform (production).
const BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default BASE;
