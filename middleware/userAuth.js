const isLogin = (req, res, next) => {
    if (req.session.user) {
        next();
    } else {
        res.redirect("/signin");
    }
}

const isLogout = (req, res, next) => {
    if (req.session.user) {
        res.redirect("/");
    }
    next();
}

module.exports = { isLogin, isLogout };