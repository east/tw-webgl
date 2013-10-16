// extend DataView
DataView.prototype.resetReader = function() {
	this.readerOffs = 0;
}

DataView.prototype.uint32 = function() {
	this.readerOffs += 4;
	return this.getUint32(this.readerOffs-4, true /* little endian */);
}

DataView.prototype.int32 = function() {
	this.readerOffs += 4;
	return this.getInt32(this.readerOffs-4, true /* little endian */);
}

