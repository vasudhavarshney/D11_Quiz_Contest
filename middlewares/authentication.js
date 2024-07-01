const Token = require('../models/TokenSchema.js');
const { isTokenValid ,attachCookiesToResponse, createJWT } = require('../utilities/jwt.js');

const authenticateUser = async (req, res, next) => {
    console.log("in authenticate user",req.headers.authorization);
    let { refreshToken, accessToken } = req?.signedCookies;
    if (req.headers.authorization && req.headers.authorization.split(' ')[0] === 'Bearer') {
        accessToken = req.headers.authorization.split(' ')[1];
    }
    
    try {
        
        if (accessToken) {
            console.log(accessToken, "gfhersfyuerg");
            const payload = isTokenValid(accessToken);
            console.log("payload.user====>",payload.user)
            req.user = payload.user;
            return next();
        }
        const payload = isTokenValid(refreshToken);

        const existingToken = await Token.findOne({
            user: payload.user.userId,
            refreshToken: payload.refreshToken,
        });

        if (!existingToken || !existingToken?.isValid) {
            return res.status(401).json({"status":false, "message":"Authentication Invalid"})
        }
        attachCookiesToResponse({
            res,
            user: payload.user,
            refreshToken: existingToken.refreshToken,
        });

        req.user = payload.user;
        
        next();
    } catch (error) {
        return res.status(401).json({"status":false, "message":"Authentication Invalid"})
    }
};

const adminAuthMiddleware = async (req, res, next) => {
    let { refreshToken, accessToken } = req.signedCookies;
    if (req.headers.authorization && req.headers.authorization.split(' ')[0] === 'Bearer') {
        accessToken = req.headers.authorization.split(' ')[1];
    }
    try {
        if (accessToken) {
            const payload = isTokenValid(accessToken);
            req.user = payload.user;
            console.log(req.user);
            return next();
        }
        const payload = isTokenValid(refreshToken);

        const existingToken = await Token.findOne({
            user: payload.user.userId,
            refreshToken: payload.refreshToken,
        });

        if (!existingToken || !existingToken?.isValid) {
            return res.status(401).json({"status":false, "message":"Authentication Invalid"})
        }
        attachCookiesToResponse({
            res,
            user: payload.user,
            refreshToken: existingToken.refreshToken,
        });

        req.user = payload.user;
        console.log(req.user);
        next();
    } catch (error) {
        return res.status(401).json({"status":false, "message":"Authentication Invalid"})
    }
}

module.exports ={
    adminAuthMiddleware,
    authenticateUser
}