const _ = require('lodash');


class test {
    constructor(a, b, c){
        this.a = a;
    }
}

_.forEach(test, (value, key) => {
    test[key] = 'value'
})

console.log(new test('1'));