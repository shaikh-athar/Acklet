package com.code.acklet.tool.tools.qr;

import com.code.acklet.tool.tools.qr.util.Base62;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class Base62Test {

    @Test
    void testRandomSlugGeneration() {
        String slug = Base62.randomSlug(6);
        assertNotNull(slug);
        assertEquals(6, slug.length());
        assertTrue(Base62.isValidSlug(slug));
    }

    @Test
    void testSlugValidation() {
        assertTrue(Base62.isValidSlug("k8s9x2"));
        assertTrue(Base62.isValidSlug("my-menu_2026"));
        assertTrue(Base62.isValidSlug("abc"));

        assertFalse(Base62.isValidSlug("ab")); // too short
        assertFalse(Base62.isValidSlug("slug with spaces"));
        assertFalse(Base62.isValidSlug("slug@invalid!"));
        assertFalse(Base62.isValidSlug(null));
    }
}
