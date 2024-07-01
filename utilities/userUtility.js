const isValidInput=(input)=>{
    const emailRegex = /^[\w-]+(?:\.[\w-]+)*@(?:[\w-]+\.)+[a-zA-Z]{2,7}$/;
    if (emailRegex.test(input)) {
        return { isValid: true, type: 'email' };
    }
    return { isValid: false };
}


  


module.exports={
    isValidInput
}