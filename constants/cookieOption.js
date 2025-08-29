
// export const cookieOption = {
//                 httpOnly: true,       // prevents client-side JS access
//                 secure: process.env.NODE_ENV === 'production' ? true : false ,
//        // set to true in production with HTTPS
//       sameSite:process.env.NODE_ENV === 'production' ? 'none' :"lax", 
//       path: '/',
//                 maxAge: 7 * 24 * 60 * 60 * 1000,
              
//             }

//             export const clearCookieOption = {
//   ...cookieOption,
//   maxAge: 0
// };


export const isProduction = process.env.NODE_ENV === 'production';

export const cookieOption = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? 'none' : 'lax',
  path: '/',
  maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
};

export const clearCookieOption = {
  ...cookieOption,
  maxAge: 0
};
