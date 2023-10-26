const express = require('express');
const mongoose = require('mongoose');
const app = express();
app.use(express.json());



// Constants.
const sizePriority = ['Small', 'Medium', 'Large', 'X-Large'];


// Define the Mongoose Schema
const parkingLotSchema = new mongoose.Schema({
  parkingLotId: String,
  floors: Number,
  slotsPerFloor: Number,
  availableSlots: [String],
});

const ParkingLot = mongoose.model('ParkingLot', parkingLotSchema);

// Ideally should be in config and passwords either in SecretManager or .env variables.
const mongoDBURI = "mongodb+srv://lazycodernk:Hih8rClIKVMUYQhV@database.di7ncpz.mongodb.net/parking-lot-db?retryWrites=true&w=majority"
// Connect to MongoDB
mongoose.connect(mongoDBURI, { useNewUrlParser: true });
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'DB connection error:'));
db.once('open', () => {
    console.log('DB connected');
  })

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Internal Server Error' });
});

// Route to onboard a new parking lot
app.post('/onboard-parking-lot', async (req, res, next) => {
  try {
    const { parkingLotId, floors, slotsPerFloor } = req.body;

    // TODO: validation
    console.log({body: req.body})

    const parkingLot = new ParkingLot({
      parkingLotId,
      floors,
      slotsPerFloor,
      availableSlots: initializeSlots(floors, slotsPerFloor),
    });

    await parkingLot.save();
    res.status(201).json({ message: 'Parking lot onboarded successfully' });
  } catch (err) {
    next(err);
  }
});

// Route to allocate a slot for a car
app.post('/allocate-slot/:parkingLotId/:carSize', async (req, res, next) => {
  try {
    const { parkingLotId, carSize } = req.params;

    console.log({params: req.params })
    
    const validationErrorMessages = {}
    if(!sizePriority.includes(carSize)){
      validationErrorMessages.carSize = `carSize is invalid, received ${carSize}, required one of ${sizePriority}`
    }

    if(Object.keys(validationErrorMessages).length > 0){
      return res.status(404).json({ validationErrorMessages });
    }

    const parkingLot = await ParkingLot.findOne({ parkingLotId });

    if (!parkingLot) {
      return res.status(404).json({ message: 'Parking lot not found' });
    }

    console.log({parkingLot})

    const allocatedSlot = allocateSlot(parkingLot, carSize);

    if (allocatedSlot) {
      return res.status(200).json({ slot: allocatedSlot });
    } else {
      return res.status(404).json({ message: 'No slot found' });
    }
  } catch (err) {
    next(err);
  }
});

// Function to initialize available slots for a parking lot
function initializeSlots(floors, slotsPerFloor) {
  const slots = [];
  for (let floor = 1; floor <= floors; floor++) {
    for (let slot = 1; slot <= slotsPerFloor; slot++) {
      slots.push(`${floor}:${slot}`);
    }
  }
  return slots;
}

// Function to allocate a slot based on car size
function allocateSlot(parkingLot, carSize) {
  

  for (let size of sizePriority) {
    if (carSize === size) {
      const availableSlot = parkingLot.availableSlots.shift();
      if (availableSlot) {
        return availableSlot;
      }
    }
  }

  return null;
}

// Start the Express server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
