const express = require('express');
const router  = express.Router();

router.get('/:id', (req, res) => {
    const id = req.params.id;
    const backendUrl = process.env.BACKEND_PUBLIC_URL || 'http://localhost:4000';

    res.json({
        name:        `#${id}`,
        description: 'Minted NFT from your app',
        image:       `${backendUrl}/images/${id}.png`,
        attributes: [{ trait_type: 'number', value: Number(id) || id }]
    });
});

module.exports = router;
