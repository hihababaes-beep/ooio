package com.sqoor.iraq;

import android.content.res.AssetFileDescriptor;
import android.util.Base64;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.FileInputStream;
import java.io.IOException;
import java.nio.ByteBuffer;
import java.nio.channels.FileChannel;

@CapacitorPlugin(name = "OfflineTiles")
public class OfflineTilesPlugin extends Plugin {

    private static final String ARCHIVE_PATH = "public/assets/iraq.pmtiles";
    private static final int MAX_RANGE_BYTES = 8 * 1024 * 1024;

    // يُفتح الملف مرة واحدة ويُعاد استخدامه: القراءة الموضعية (pread) أسرع من فتح الملف وتخطي البايتات في كل بلاطة.
    private AssetFileDescriptor archive;
    private FileInputStream stream;
    private FileChannel channel;
    private long archiveStart;
    private long archiveSize;

    private synchronized FileChannel openArchive() throws IOException {
        if (channel != null && channel.isOpen()) {
            return channel;
        }
        archive = getContext().getAssets().openFd(ARCHIVE_PATH);
        stream = archive.createInputStream();
        channel = stream.getChannel();
        archiveStart = archive.getStartOffset();
        archiveSize = archive.getLength();
        return channel;
    }

    @PluginMethod
    public void readRange(PluginCall call) {
        Long offset = call.getLong("offset");
        Integer length = call.getInt("length");
        if (offset == null || offset < 0 || length == null || length <= 0 || length > MAX_RANGE_BYTES) {
            call.reject("Invalid offline map byte range.");
            return;
        }

        try {
            FileChannel file = openArchive();
            if (offset > archiveSize || length > archiveSize - offset) {
                call.reject("Offline map byte range is outside the archive.");
                return;
            }

            ByteBuffer buffer = ByteBuffer.allocate(length);
            long position = archiveStart + offset;
            while (buffer.hasRemaining()) {
                int count = file.read(buffer, position + buffer.position());
                if (count == -1) {
                    throw new IOException("Unexpected end of offline map archive.");
                }
            }

            JSObject result = new JSObject();
            result.put("data", Base64.encodeToString(buffer.array(), Base64.NO_WRAP));
            call.resolve(result);
        } catch (IOException | RuntimeException error) {
            call.reject("Unable to read the offline map archive.", error);
        }
    }

    @Override
    protected void handleOnDestroy() {
        try {
            if (stream != null) stream.close();
            if (archive != null) archive.close();
        } catch (IOException ignored) {
        }
        super.handleOnDestroy();
    }
}
