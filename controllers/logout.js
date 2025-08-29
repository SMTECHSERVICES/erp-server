import { clearCookieOption } from "../constants/cookieOption.js";

const logout = async (req, res) => {
  try {
    res.cookie('token', '', clearCookieOption);

    res.setHeader('Cache-Control', 'no-store, max-age=0');
    res.setHeader('Pragma', 'no-cache');

    res.status(200).json({ 
      success: true,
      message: 'Successfully logged out' 
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      
      message: 'Server error during logout'
    });
  }
};



export default logout