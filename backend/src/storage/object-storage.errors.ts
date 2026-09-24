export class ObjectStorageUnavailableException extends Error {
  constructor(message = 'Object storage is unavailable') {
    super(message);
    this.name = 'ObjectStorageUnavailableException';
  }
}
