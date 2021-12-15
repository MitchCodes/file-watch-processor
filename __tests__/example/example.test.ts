describe('example-test', () => {
    beforeAll(() => {
        //stuff to do before
    });

    // tslint:disable-next-line:mocha-unneeded-done
    test('expect true to be truthy', (done: any) => {
        expect(true).toBeTruthy();
        done();
    });

    afterAll(() => {
        // stuff to do after
    });
});
