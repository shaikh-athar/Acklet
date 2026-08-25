package com.code.acklet.tool.easyconvert;

import org.springframework.core.io.InputStreamResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;

@RestController
@RequestMapping("/api/v1/tools/easy-convert")
@CrossOrigin(origins = "*")
public class EasyConvertController {

    private final EasyConvertService easyConvertService;

    public EasyConvertController(EasyConvertService easyConvertService) {
        this.easyConvertService = easyConvertService;
    }

    @PostMapping("/jobs")
    public ResponseEntity<EasyConvertJobResponseDto> createJob(
            @RequestParam("file") MultipartFile file,
            @RequestParam("targetFormat") String targetFormat
    ) {
        EasyConvertJobResponseDto job = easyConvertService.createJob(file, targetFormat);
        return ResponseEntity.ok(job);
    }

    @GetMapping("/jobs/{jobId}/status")
    public ResponseEntity<EasyConvertJobResponseDto> getJobStatus(@PathVariable String jobId) {
        EasyConvertJobResponseDto job = easyConvertService.getJobStatus(jobId);
        return ResponseEntity.ok(job);
    }

    @PostMapping("/jobs/{jobId}/cancel")
    public ResponseEntity<Void> cancelJob(@PathVariable String jobId) {
        easyConvertService.cancelJob(jobId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/jobs/{jobId}/download")
    public ResponseEntity<Resource> downloadOutputFile(@PathVariable String jobId) throws IOException {
        File file = easyConvertService.getOutputFile(jobId);
        InputStreamResource resource = new InputStreamResource(new FileInputStream(file));

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + file.getName().replace(jobId + "_", "") + "\"")
                .contentLength(file.length())
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .body(resource);
    }
}
