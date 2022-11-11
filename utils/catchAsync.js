//take param fn, and returns a fn
//the result of 'catchAsync' will be the returned anonymous function
module.exports = catchAsync = (fn) => {
  //result of catchAsync will be returned func
  //If we return a function, then Express will call that function with req, res and next. We in turn can pass those variables to fn(req, res, next).

  return (req, res, next) => {
    //has access to fn function because of closures

    //calling fn, if rejected promise, we go catch (removes need for try/catch)
    fn(req, res, next).catch((err) => next(err)); //sends error to global handing middleware
  };
};
