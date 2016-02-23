QUnit.test('new bgsim.Point(123, 456)', function( assert ) {
    var point = new bgsim.Point(123, 456);

    assert.equal(point.x, 123, 'point.x == 123');
    assert.equal(point.y, 456, 'point.y == 456');
});
QUnit.test('bgsim.Point#translate', function( assert ) {
    var point = new bgsim.Point(123, 456);

    var context = {};
    context.translate = function (x, y) { this.x = x; this.y = y; };

    point.translate(context);
    assert.equal(context.x, 123, 'context#translate(123, 456)');
    assert.equal(context.y, 456, 'context#translate(123, 456)');
});
QUnit.test('bgsim.Point#toString', function( assert ) {
    var point = new bgsim.Point(123, 456);
    assert.equal(point.toString(), '[123,456]', 'toString()');
});
