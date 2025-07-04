const isLogin = (req, res, next) => {
    if (req.session.user) {
        next();
    } else {
        res.redirect("/admin/login");
    }
}

const isLogout = (req, res, next) => {
    if (req.session.user) {
        res.redirect("/admin");
    }
    next();
}

module.exports = { isLogin, isLogout };