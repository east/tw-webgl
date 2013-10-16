window.onload = function() {
	document.getElementById("fileSelect").addEventListener('change', function(evt){
		file = evt.target.files[0];

		reader = new FileReader();
		reader.readAsArrayBuffer(file);

		reader.onloadend = function(file) {
			data = file.target.result;
			// try to parse datafile
			dfile = new TwDataFile(data);
			dfile.parse();

			console.log(dfile)
		}
	}, false);
}

function TwDataFile(fileData) {
	this.fileData = fileData;
}

// extend DataView
DataView.prototype.resetReader = function() {
	this.readerOffs = 0;
}

DataView.prototype.uint32 = function() {
	this.readerOffs += 4;
	return this.getUint32(this.readerOffs-4, true /* little endian */);
}

TwDataFile.prototype.parse = function() {
	console.log("begin parsing");

	data = new DataView(this.fileData)
	data.resetReader();

	// parse header
	
	var signature = data.uint32()

	// signature 'DATA' or 'ATAD'
	if (signature == 0x41544144 || signature == 0x44415441)
		console.log("valid signature")
	else
		return false;

	this.version = data.uint32();

	// calculate checksum
	this.crc = Zlib.CRC32.calc(new Uint8Array(this.fileData), 0, this.fileData.byteLength)
	console.log("crc", this.crc.toString(16))

	// we only support datafile version 4
	if (this.version != 4)
	{
		console.log("invalid version", this.version)
		return false;
	}

	this.size = data.uint32();
	this.swapLen = data.uint32();
	this.numItemTypes = data.uint32();
	this.numItems = data.uint32();
	this.numRawData = data.uint32();
	this.itemSize = data.uint32();
	this.dataSize = data.uint32();

	var itemTypesStart = data.readerOffs;
	var itemOffsetsStart = itemTypesStart+this.numItemTypes*12;
	var dataOffsetsStart = itemOffsetsStart+this.numItems*4;
	var dataSizesStart = dataOffsetsStart+this.numRawData*4;
	
	this.itemStart = dataSizesStart+this.numRawData*4;
	this.dataStart = this.itemStart+this.itemSize

	// read item types
	this.itemTypes = []
	for (var i = 0; i < this.numItemTypes; i++) {
		this.itemTypes.push({
			type: data.uint32(),
			start: data.uint32(),
			num: data.uint32()
		})
	}

	// read item offsets
	this.itemOffsets = []
	for (var i = 0; i < this.numItems; i++) {
		this.itemOffsets.push(data.uint32());
	}

	// read data infos
	// offsets
	this.dataInfos = []
	for (var i = 0; i < this.numRawData; i++) {
		this.dataInfos.push({ offset: data.uint32() });	
	}
	// data sizes
	for (var i = 0; i < this.numRawData; i++) {
		// uncompressed size
		this.dataInfos[i].size = data.uint32()
		// compressed size
		if (i == this.numRawData-1) {
			this.dataInfos[i].compSize = this.dataSize-this.dataInfos[i].offset;
		} else {
			this.dataInfos[i].compSize = this.dataInfos[i+1].offset-this.dataInfos[i].offset;
		}
	}

	return true;
}
