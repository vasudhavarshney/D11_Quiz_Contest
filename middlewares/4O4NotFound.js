const notFound = (req, res) => res.status(404).json({ message: 'Route does not exist', status: false })

module.exports = notFound
