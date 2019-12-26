import { expect } from 'chai';

describe('Extension Unit Test sample', () => {
    it('Sample test', () => {
        expect([1, 2, 3].indexOf(2)).to.be.equal(1);
        expect([1, 2, 3].indexOf(5)).to.be.equal(-1);
    });
});
