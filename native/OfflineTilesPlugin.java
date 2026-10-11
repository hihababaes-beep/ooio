package com.sqoor.iraq.offline;

import android.content.res.AssetFileDescriptor;
import android.util.Base64;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.IOException;
import java.io.InputStream;

@CapacitorPlugin(name = "OfflineTiles")
public class OfflineTilesPlugin extends Plugin {

    private static final String ARCHIVE_PATH = "public/assets/iraq.pmtiles";
    private static final int MAX_RANGE_BYTES = 8 * 1024 * 1024;

    @PluginMethod
    public void readRange(PluginCall call) {
        Long offset = call.getLong("offset");
        Integer length = call.getInt("length");
        if (offset == null || offset < 0 || length == null || length <= 0 || length > MAX_RANGE_BYTES) {
            call.reject("Invalid offline map byte range.");
            return;
        }

        try (AssetFileDescriptor archive = getContext().getAssets().openFd(ARCHIVE_PATH);
             InputStream input = archive.createInputStream()) {
            if (offset > archive.getLength() || length > archive.getLength() - offset) {
                call.reject("Offline map byte range is outside the archive.");
                return;
            }

            skipFully(input, offset);
            byte[] bytes = new byte[length];
            readFully(input, bytes);
            JSObject result = new JSObject();
            result.put("data", Base64.encodeToString(bytes, Base64.NO_WRAP));
            call.resolve(result);
        } catch (IOException | RuntimeException error) {
            call.reject("Unable to read the offline map archive.", error);
        }
    }

    private static void skipFully(InputStream input, long bytes) throws IOException {
        long remaining = bytes;
        while (remaining > 0) {
            long skipped = input.skip(remaining);
            if (skipped == 0) {
                if (input.read() == -1) {
                    throw new IOException("Unexpected end of offline map archive.");
                }
                skipped = 1;
            }
            remaining -= skipped;
        }
    }

    private static void readFully(InputStream input, byte[] bytes) throws IOException {
        int offset = 0;
        while (offset < bytes.length) {
            int count = input.read(bytes, offset, bytes.length - offset);
            if (count == -1) {
                throw new IOException("Unexpected end of offline map archive.");
            }
            offset += count;
        }
    }
}
