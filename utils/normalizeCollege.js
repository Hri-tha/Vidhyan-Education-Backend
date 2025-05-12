function normalizeCollege(name) {
    return name
      .toLowerCase()
      .replace('indian institute of information technology', 'iiit')
      .replace('indian institute of technology', 'iit')
      .replace('national institute of technology', 'nit')
      .replace(/,/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }
  
  module.exports = normalizeCollege;
  