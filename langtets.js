function makePromise(success) {
  return new Promise((resolve, reject) => {
    if (success) {
      resolve("It worked!");
    } else {
      reject("Something broke");
    }
  });
}

async function runPromise(success) {
  try {
    const result = await makePromise(success);
    console.log(result);
  } catch (err) {
    console.error(err);
  }
}

runPromise(true);    // It worked!
runPromise(false);   // Something broke